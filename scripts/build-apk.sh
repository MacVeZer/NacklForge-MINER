#!/usr/bin/env bash
# Build script for NacklForge APK — uses Android SDK build-tools directly
# (no Gradle needed — minimal hand-crafted build like the original MinerGo)
set -euo pipefail

export ANDROID_HOME=${ANDROID_HOME:-/home/z/android-sdk}
BUILD_TOOLS=$ANDROID_HOME/build-tools/35.0.0
PLATFORM_JAR=$ANDROID_HOME/platforms/android-34/android.jar
SRC=/home/z/my-project/apk_src
BUILD=/home/z/my-project/apk_build
OUT=/home/z/my-project/download

KEYSTORE=$BUILD/nacklforge.keystore
ALIAS=nacklforge
STOREPASS=nacklforge
KEYPASS=nacklforge

APK_UNSIGNED=$BUILD/nacklforge-unsigned.apk
APK_ALIGNED=$BUILD/nacklforge-aligned.apk
APK_FINAL=$OUT/NacklForge.apk

echo "==> [1/8] Clean build dir"
rm -rf "$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/obj" "$OUT"

echo "==> [2/8] Compile resources with aapt2"
$BUILD_TOOLS/aapt2 compile --dir "$SRC/res" -o "$BUILD/resources.zip"

echo "==> [3/8] Link resources + generate R.java + AndroidManifest"
$BUILD_TOOLS/aapt2 link \
    -o "$BUILD/resources-compiled.apk" \
    --manifest "$SRC/AndroidManifest.xml" \
    -I "$PLATFORM_JAR" \
    --java "$BUILD/gen" \
    --min-sdk-version 26 \
    --target-sdk-version 34 \
    -A "$SRC/assets" \
    "$BUILD/resources.zip"

echo "==> [4/8] Compile Java sources (with androidx.core)"
find "$BUILD/gen" -name "*.java" > "$BUILD/sources.txt"
echo "$SRC/src/com/nackl/forge/MainActivity.java" >> "$BUILD/sources.txt"
echo "$SRC/src/com/nackl/forge/MinerStatusService.java" >> "$BUILD/sources.txt"
echo "$SRC/src/com/nackl/forge/BootReceiver.java" >> "$BUILD/sources.txt"
javac -source 17 -target 17 \
    -classpath "$PLATFORM_JAR:$SRC/libs/androidx.core.jar" \
    -d "$BUILD/obj" \
    @"$BUILD/sources.txt" 2>&1 | tail -20

echo "==> [5/8] Dex compiled classes with d8 (include androidx.core.jar)"
# Package our classes + androidx.core together for dexing
cd "$BUILD/obj"
jar uf "$SRC/libs/androidx.core.jar" $(find . -name "*.class" | sed 's|^\./||')
cd - > /dev/null
$BUILD_TOOLS/d8 \
    --min-api 26 \
    --lib "$PLATFORM_JAR" \
    --output "$BUILD" \
    "$SRC/libs/androidx.core.jar"

echo "==> [6/8] Assemble unsigned APK"
cp "$BUILD/resources-compiled.apk" "$APK_UNSIGNED"
cd "$BUILD"
zip -u -q "$APK_UNSIGNED" classes.dex
cd - > /dev/null

echo "==> [7/8] Zipalign"
$BUILD_TOOLS/zipalign -f -p 4 "$APK_UNSIGNED" "$APK_ALIGNED"

echo "==> [8/8] Sign APK"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias "$ALIAS" \
        -keyalg RSA -keysize 2048 \
        -validity 10000 \
        -storepass "$STOREPASS" \
        -keypass "$KEYPASS" \
        -dname "CN=NacklForge, OU=App, O=NacklForge, L=Earth, ST=Earth, C=EA" 2>&1 | tail -3
fi
$BUILD_TOOLS/apksigner sign \
    --ks "$KEYSTORE" \
    --ks-key-alias "$ALIAS" \
    --ks-pass "pass:$STOREPASS" \
    --key-pass "pass:$KEYPASS" \
    --out "$APK_FINAL" \
    "$APK_ALIGNED"

echo ""
echo "==> Done!"
ls -la "$APK_FINAL"
echo ""
$BUILD_TOOLS/aapt2 dump badging "$APK_FINAL" | head -10
