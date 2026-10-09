package com.nakulcreations.catos;

import android.content.SharedPreferences;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * CAT OS Pro through Google Play: a yearly subscription or a one-time
 * lifetime purchase. Whether this phone is Pro is kept in preferences so it
 * holds offline (Pro plays offline) and is refreshed from Play on every
 * return to the app; Play decides, this only remembers.
 */
final class Billing implements PurchasesUpdatedListener {
    static final String YEARLY = "catos_pro_yearly";
    static final String LIFETIME = "catos_pro_lifetime";

    private final MainActivity act;
    private final SharedPreferences prefs;
    private final BillingClient client;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private Consumer<String> buying;

    Billing(MainActivity act) {
        this.act = act;
        prefs = act.getSharedPreferences("pro", 0);
        client = BillingClient.newBuilder(act)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection()
                .build();
    }

    boolean isPro() { return prefs.getBoolean("pro", false); }
    String plan() { return prefs.getString("plan", ""); }
    void end() { client.endConnection(); }

    private void connect(Runnable ok, Runnable fail) {
        if (client.isReady()) { ok.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(@NonNull BillingResult r) {
                act.runOnUiThread(r.getResponseCode() == BillingClient.BillingResponseCode.OK ? ok : fail);
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    /** Ask Play what this account owns; answers whether it is Pro. */
    void refresh(Consumer<Boolean> done) {
        connect(() -> client.queryPurchasesAsync(params(BillingClient.ProductType.SUBS), (r1, subs) ->
                client.queryPurchasesAsync(params(BillingClient.ProductType.INAPP), (r2, inapp) -> act.runOnUiThread(() -> {
                    if (r1.getResponseCode() != BillingClient.BillingResponseCode.OK || r2.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        done.accept(isPro());
                        return;
                    }
                    List<Purchase> all = new ArrayList<>(subs);
                    all.addAll(inapp);
                    String plan = "";
                    for (Purchase p : all) {
                        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                        if (!p.isAcknowledged()) {
                            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), r -> { });
                        }
                        if (p.getProducts().contains(LIFETIME)) plan = "lifetime";
                        else if (plan.isEmpty() && p.getProducts().contains(YEARLY)) plan = "yearly";
                    }
                    save(plan);
                    done.accept(!plan.isEmpty());
                }))), () -> done.accept(isPro()));
    }

    private static QueryPurchasesParams params(String type) {
        return QueryPurchasesParams.newBuilder().setProductType(type).build();
    }

    private void save(String plan) {
        boolean was = isPro(), now = !plan.isEmpty();
        prefs.edit().putBoolean("pro", now).putString("plan", plan).apply();
        if (was != now) act.event("{\"type\":\"pro\",\"pro\":" + now + "}");
    }

    /** Prices as Play will charge them, in the learner's currency. */
    void products(Consumer<String> done) {
        connect(() -> query(BillingClient.ProductType.SUBS, YEARLY, () ->
                query(BillingClient.ProductType.INAPP, LIFETIME, () -> done.accept(productsJson()))),
                () -> done.accept("{\"products\":[]}"));
    }

    private void query(String type, String id, Runnable then) {
        QueryProductDetailsParams q = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build()))
                .build();
        client.queryProductDetailsAsync(q, (r, result) -> act.runOnUiThread(() -> {
            for (ProductDetails d : result.getProductDetailsList()) details.put(d.getProductId(), d);
            then.run();
        }));
    }

    private static ProductDetails.SubscriptionOfferDetails baseOffer(ProductDetails d) {
        List<ProductDetails.SubscriptionOfferDetails> offers = d.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        for (ProductDetails.SubscriptionOfferDetails o : offers) if (o.getOfferId() == null) return o;
        return offers.get(0);
    }

    private String productsJson() {
        JSONArray out = new JSONArray();
        try {
            for (ProductDetails d : details.values()) {
                JSONObject p = new JSONObject().put("id", d.getProductId());
                ProductDetails.SubscriptionOfferDetails offer = baseOffer(d);
                ProductDetails.OneTimePurchaseOfferDetails once = d.getOneTimePurchaseOfferDetails();
                if (offer != null) {
                    List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                    ProductDetails.PricingPhase full = phases.get(phases.size() - 1);
                    p.put("price", full.getFormattedPrice()).put("micros", full.getPriceAmountMicros()).put("currency", full.getPriceCurrencyCode()).put("period", full.getBillingPeriod());
                } else if (once != null) {
                    p.put("price", once.getFormattedPrice()).put("micros", once.getPriceAmountMicros()).put("currency", once.getPriceCurrencyCode());
                } else continue;
                out.put(p);
            }
            return new JSONObject().put("products", out).toString();
        } catch (JSONException e) {
            return "{\"products\":[]}";
        }
    }

    void buy(String id, Consumer<String> done) {
        ProductDetails d = details.get(id);
        if (d == null) {
            products(json -> {
                if (details.containsKey(id)) buy(id, done);
                else done.accept("{\"pro\":false,\"reason\":\"unavailable\"}");
            });
            return;
        }
        BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
        ProductDetails.SubscriptionOfferDetails offer = baseOffer(d);
        if (offer != null) item.setOfferToken(offer.getOfferToken());
        buying = done;
        BillingResult r = client.launchBillingFlow(act, BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(item.build())).build());
        if (r.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            buying = null;
            refresh(pro -> done.accept("{\"pro\":" + pro + "}"));
        } else if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            buying = null;
            done.accept("{\"pro\":false,\"reason\":\"error\"}");
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult r, List<Purchase> purchases) {
        act.runOnUiThread(() -> {
            Consumer<String> done = buying;
            buying = null;
            int code = r.getResponseCode();
            if (code == BillingClient.BillingResponseCode.OK || code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                boolean pending = false;
                if (purchases != null) for (Purchase p : purchases) pending |= p.getPurchaseState() == Purchase.PurchaseState.PENDING;
                boolean wait = pending;
                refresh(pro -> {
                    if (done != null) done.accept(pro ? "{\"pro\":true}" : "{\"pro\":false,\"reason\":\"" + (wait ? "pending" : "error") + "\"}");
                });
            } else if (done != null) {
                done.accept("{\"pro\":false,\"reason\":\"" + (code == BillingClient.BillingResponseCode.USER_CANCELED ? "cancelled" : "error") + "\"}");
            }
        });
    }
}
