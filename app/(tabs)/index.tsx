// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as SystemUI from 'expo-system-ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

/* ----------------- Map HTML ----------------- */
function makeMapHTML(user) {
  const lat = user?.lat ?? 14.5995;
  const lon = user?.lon ?? 120.9842;
  return `<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html,body,#map{height:100%;margin:0;background:#ffffff}
    #map{border-radius:16px;overflow:hidden}
    .user-marker{background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3)}
  </style>
</head><body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lon}],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    var marker=L.marker([${lat},${lon}],{icon:L.divIcon({className:'user-marker',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);

    window.fromRN = function(data){
      if(data && data.type==='centerMap' && data.lat && data.lon){
        map.setView([data.lat, data.lon], 14);
      }
    };
  </script>
</body></html>`;
}

/* ----------------- Constants ----------------- */
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMPACT = SCREEN_HEIGHT < 700;

const BORDER = '#EAF0F6';
const HEADER_BORDER = '#DDEAF7';
const ICON_COLOR = '#0B3D5B';
const TABBAR_HEIGHT = 30;
const TABBAR_BOTTOM_MARGIN = 5;
const EXTRA_CUSHION = 1;
const BOTTOM_CLEARANCE = TABBAR_HEIGHT + TABBAR_BOTTOM_MARGIN + EXTRA_CUSHION;

/* ----------------- Header ----------------- */
function HeaderCard() {
  const router = useRouter();
  const [notifCount] = useState(2);

  return (
    <ThemedView
      style={[
        styles.headerCard,
        COMPACT && { marginTop: 6, paddingVertical: 10, paddingHorizontal: 12 },
      ]}
    >
      <View style={styles.headerRow}>
        {/* Logo */}
        <Image
          source={require('../../assets/images/Sheltr.png')}
          style={[styles.logo, COMPACT && { height: 28 }]}
          resizeMode="contain"
        />

        {/* Notifications (routes to /notifications) */}
        <Pressable
          onPress={() => router.push('/notifications')}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
        >
          {Platform.OS === 'ios' ? (
            <IconSymbol name="bell.fill" size={18} color="#0B3D5B" />
          ) : (
            <Ionicons name="notifications" size={20} color="#0B3D5B" />
          )}
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{notifCount}</ThemedText>
          </View>
        </Pressable>
      </View>
    </ThemedView>
  );
}

/* ----------------- Weather Card ----------------- */
function WeatherCard({ dateTime, temp, humidity, rain, loading }) {
  return (
    <ThemedView
      style={[styles.card, COMPACT && { marginTop: 10, paddingVertical: 16 }]}
    >
      <ThemedText style={[styles.sectionLabel, COMPACT && { marginBottom: 8 }]}>
        Weather Update
      </ThemedText>

      <View style={[styles.metricRow, { marginBottom: COMPACT ? 6 : 10 }]}>
        <Ionicons name="calendar" size={18} color={ICON_COLOR} />
        <ThemedText style={styles.metricText}>{dateTime}</ThemedText>
      </View>

      <View
        style={[
          styles.tempRow,
          COMPACT && { marginVertical: 6, minHeight: 52 },
        ]}
      >
        <Ionicons
          name="thermometer"
          size={26}
          color={ICON_COLOR}
          style={[styles.tempIcon, COMPACT && { marginBottom: 4 }]}
        />
        <ThemedText
          style={[styles.tempText, COMPACT && { fontSize: 42, lineHeight: 46 }]}
        >
          {typeof temp === 'number' ? Math.round(temp) : temp}°C
        </ThemedText>
      </View>

      <View style={styles.row}>
        <View
          style={[
            styles.smallCard,
            { marginRight: 12 },
            COMPACT && { padding: 10 },
          ]}
        >
          <Ionicons name="water" size={18} color={ICON_COLOR} />
          <View style={{ marginLeft: 8 }}>
            <ThemedText style={styles.miniLabel}>Humidity</ThemedText>
            <ThemedText style={styles.miniValue}>{humidity}</ThemedText>
          </View>
        </View>

        <View style={[styles.smallCard, COMPACT && { padding: 10 }]}>
          <Ionicons name="rainy" size={18} color={ICON_COLOR} />
          <View style={{ marginLeft: 8 }}>
            <ThemedText style={styles.miniLabel}>Rain</ThemedText>
            <ThemedText style={styles.miniValue}>{rain}</ThemedText>
          </View>
        </View>
      </View>

      {loading && (
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
    </ThemedView>
  );
}

/* ----------------- Main Screen ----------------- */
export default function HomeScreen() {
  const webRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [wx, setWx] = useState({
    temperature: null,
    humidity: null,
    precipitation: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#ffffff');
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const pos = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setCoords(pos);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,relative_humidity_2m,precipitation`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        setWx({
          temperature: data?.current?.temperature_2m ?? null,
          humidity: data?.current?.relative_humidity_2m ?? null,
          precipitation: data?.current?.precipitation ?? null,
        });
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const temp = wx.temperature ?? '--';
  const humidity = wx.humidity != null ? `${wx.humidity}%` : '--';
  const rain = wx.precipitation != null ? `${wx.precipitation} mm` : '0 mm';
  const dateTime = new Date().toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const topSpacer =
    Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 4 : 6;

  const handleCenterToMe = () => {
    if (coords && webRef.current) {
      const js = `window.fromRN && window.fromRN(${JSON.stringify({
        type: 'centerMap',
        lat: coords.lat,
        lon: coords.lon,
      })}); true;`;
      webRef.current.injectJavaScript(js);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <RNStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topSpacer,
            paddingBottom: BOTTOM_CLEARANCE,
          },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <HeaderCard />

        <WeatherCard
          dateTime={dateTime}
          temp={temp}
          humidity={humidity}
          rain={rain}
          loading={loading}
        />

        <ThemedView
          style={[
            styles.card,
            { marginBottom: 10, paddingVertical: COMPACT ? 16 : 20 },
          ]}
        >
          <ThemedText
            style={[styles.sectionLabel, COMPACT && { marginBottom: 8 }]}
          >
            Live User Map
          </ThemedText>

          <View style={styles.mapWrap}>
            <WebView
              ref={webRef}
              source={{ html: makeMapHTML(coords) }}
              style={[styles.map, { height: COMPACT ? 280 : 320 }]}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              scrollEnabled={false}
            />
          </View>

          <Pressable
            onPress={handleCenterToMe}
            style={[styles.centerButton, { marginTop: 10 }]}
          >
            <Ionicons name="navigate" size={16} color="#ffffff" />
            <ThemedText style={styles.centerButtonText}>Center to Me</ThemedText>
          </Pressable>
        </ThemedView>

        <View style={{ height: 6 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------- Styles ----------------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { backgroundColor: '#ffffff' },

  headerCard: {
    marginHorizontal: 16,
    marginTop: 0,
    backgroundColor: '#F8FBFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: HEADER_BORDER,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 120, height: 32 },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: HEADER_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  card: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#9AA4AE',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricText: { fontWeight: '700', color: '#0B3D5B' },

  tempRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 10,
  },
  tempIcon: { marginRight: 6, marginBottom: 6 },
  tempText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0B3D5B',
    lineHeight: 54,
  },
  row: { flexDirection: 'row' },
  smallCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  miniLabel: { fontSize: 12, color: '#6B7280' },
  miniValue: { fontSize: 16, fontWeight: '800', color: '#0B3D5B' },

  mapWrap: {
    marginTop: 5,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  map: { width: '100%', backgroundColor: '#ffffff' },

  centerButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#0B3D5B',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  centerButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
