package com.nakulcreations.catos;

import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.firestore.Blob;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Source;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

/**
 * Sign in with Google, and the one cloud save that comes with it.
 *
 * Google's own account sheet (Credential Manager) hands over an ID token,
 * Firebase Auth turns it into an account, and Firestore keeps that account's
 * save at saves/{uid}: the page's backup file (core/storage/backup.js),
 * gzipped. The Firestore rules let only that uid read or write it. The page
 * decides when to save and what to restore (shell/account.js); this only
 * carries it. Every answer is JSON: {"ok":true,...} or {"ok":false,"reason"}.
 */
final class Cloud {
    /** A Firestore document holds at most 1 MiB, field names included. */
    private static final int MAX_BYTES = 1_000_000;

    private final MainActivity act;
    private final CredentialManager creds;
    private final FirebaseAuth auth = FirebaseAuth.getInstance();

    Cloud(MainActivity act) {
        this.act = act;
        creds = CredentialManager.create(act);
    }

    /** {"uid","email","name"} of the account signed in on this phone, or "". */
    String account() {
        FirebaseUser u = auth.getCurrentUser();
        if (u == null) return "";
        try {
            return new JSONObject().put("uid", u.getUid()).put("email", nz(u.getEmail())).put("name", nz(u.getDisplayName())).toString();
        } catch (JSONException e) {
            return "";
        }
    }

    void signIn(Consumer<String> done) {
        google(token -> auth.signInWithCredential(GoogleAuthProvider.getCredential(token, null))
                .addOnCompleteListener(act, t -> done.accept(t.isSuccessful() ? "{\"ok\":true}" : no("error"))), done);
    }

    void signOut(Consumer<String> done) {
        auth.signOut();
        // Forget the account picked, too, so the next sign-in asks again.
        creds.clearCredentialStateAsync(new ClearCredentialStateRequest(), null, ContextCompat.getMainExecutor(act),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void v) { done.accept("{\"ok\":true}"); }
                    @Override public void onError(ClearCredentialException e) { done.accept("{\"ok\":true}"); }
                });
    }

    void save(String json, Consumer<String> done) {
        FirebaseUser u = auth.getCurrentUser();
        if (u == null) { done.accept(no("signed-out")); return; }
        if (!act.online()) { done.accept(no("offline")); return; }
        byte[] gz = gzip(json);
        // ponytail: one document per account; split the save across documents if a village ever outgrows 1 MB gzipped
        if (gz == null || gz.length > MAX_BYTES) { done.accept(no("too-big")); return; }
        Map<String, Object> doc = new HashMap<>();
        doc.put("data", Blob.fromBytes(gz));
        doc.put("savedAt", FieldValue.serverTimestamp());
        doc.put("app", BuildConfig.VERSION_NAME);
        doc(u).set(doc).addOnCompleteListener(act, t -> done.accept(t.isSuccessful() ? "{\"ok\":true}" : no("error")));
    }

    /** {"ok":true,"backup":{...}} with the account's save from the server, or "backup":null if it has none. */
    void load(Consumer<String> done) {
        FirebaseUser u = auth.getCurrentUser();
        if (u == null) { done.accept(no("signed-out")); return; }
        doc(u).get(Source.SERVER).addOnCompleteListener(act, t -> {
            if (!t.isSuccessful()) { done.accept(no(act.online() ? "error" : "offline")); return; }
            Blob b = t.getResult().getBlob("data");
            if (b == null) { done.accept("{\"ok\":true,\"backup\":null}"); return; }
            String json = gunzip(b.toBytes());
            done.accept(json == null ? no("error") : "{\"ok\":true,\"backup\":" + json + "}");
        });
    }

    /** The save, then the account. Firebase deletes an account only just after a sign-in, so Google's sheet shows once more. */
    void delete(Consumer<String> done) {
        FirebaseUser u = auth.getCurrentUser();
        if (u == null) { done.accept(no("signed-out")); return; }
        google(token -> u.reauthenticate(GoogleAuthProvider.getCredential(token, null)).addOnCompleteListener(act, r -> {
            if (!r.isSuccessful()) { done.accept(no("error")); return; }
            doc(u).delete().addOnCompleteListener(act, d -> {
                if (!d.isSuccessful()) { done.accept(no("error")); return; }
                u.delete().addOnCompleteListener(act, x -> {
                    if (x.isSuccessful()) signOut(done); else done.accept(no("error"));
                });
            });
        }), done);
    }

    /** Google's account sheet: hands on an ID token, or answers why there is none. */
    private void google(Consumer<String> token, Consumer<String> done) {
        GetCredentialRequest req = new GetCredentialRequest.Builder()
                .addCredentialOption(new GetSignInWithGoogleOption.Builder(act.getString(R.string.default_web_client_id)).build())
                .build();
        creds.getCredentialAsync(act, req, null, ContextCompat.getMainExecutor(act),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse r) {
                        Credential c = r.getCredential();
                        String id = null;
                        if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                            try { id = GoogleIdTokenCredential.createFrom(c.getData()).getIdToken(); } catch (Exception ignored) { }
                        }
                        if (id != null) token.accept(id); else done.accept(no("error"));
                    }
                    @Override public void onError(GetCredentialException e) {
                        done.accept(no(e instanceof GetCredentialCancellationException ? "cancelled" : "error"));
                    }
                });
    }

    private static DocumentReference doc(FirebaseUser u) {
        return FirebaseFirestore.getInstance().collection("saves").document(u.getUid());
    }

    private static String no(String reason) { return "{\"ok\":false,\"reason\":\"" + reason + "\"}"; }

    private static String nz(String s) { return s == null ? "" : s; }

    private static byte[] gzip(String s) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (GZIPOutputStream z = new GZIPOutputStream(out)) {
            z.write(s.getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            return null;
        }
        return out.toByteArray();
    }

    private static String gunzip(byte[] b) {
        try (GZIPInputStream z = new GZIPInputStream(new ByteArrayInputStream(b))) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            for (int n; (n = z.read(buf)) > 0; ) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }
}
