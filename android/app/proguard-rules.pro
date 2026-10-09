# The page calls these by name through window.CatOSAndroid.
-keepclassmembers class com.nakulcreations.catos.Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
