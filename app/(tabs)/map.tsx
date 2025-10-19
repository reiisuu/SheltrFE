import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

/* ------------------------------ Data ------------------------------ */
const EVACUATION_CENTERS = [
  { id: '1', name: 'Fort Bonifacio Elementary School', latitude: 14.5378, longitude: 121.0475, capacity: 500 },
  { id: '2', name: 'Taguig City Hall', latitude: 14.5176, longitude: 121.0509, capacity: 300 },
  { id: '3', name: 'BGC High School', latitude: 14.5523, longitude: 121.0518, capacity: 600 },
  { id: '4', name: 'Tuktukan Elementary School', latitude: 14.5089, longitude: 121.0389, capacity: 400 },
];

const FLOOD_ZONES = [
  { id: 'high_1', riskLevel: 'high', coordinates: [[121.035,14.520],[121.040,14.525],[121.038,14.530],[121.042,14.535],[121.045,14.540]] },
  { id: 'moderate_1', riskLevel: 'moderate', coordinates: [[121.048,14.545],[121.052,14.548],[121.055,14.550]] },
  { id: 'safe_1', riskLevel: 'safe', coordinates: [[121.030,14.515],[121.032,14.518],[121.035,14.520]] },
];

/* ----------------------------- Icon bridge ----------------------------- */
// Use IconSymbol on iOS; Ionicons fallback on Android.
function AppIcon({ name, size, color }) {
  if (Platform.OS === 'ios') {
    return <IconSymbol name={name} size={size} color={color} />;
  }
  const map = {
    'chevron.left': 'chevron-back',
    'bell.fill': 'notifications',
    'magnifyingglass': 'search',
    'xmark': 'close',
    'paperplane.fill': 'send',
    'house.fill': 'home',
    'plus': 'add',
  };
  return <Ionicons name={map[name]} size={size} color={color} />;
}

/* ----------------------------- Map HTML ----------------------------- */
const generateMapHTML = (centers, floodZones, userLocation, selectedCenter) => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0}
  .custom-marker{background:#0B5AA2;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .user-marker{background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3)}
  .popup-title{font-size:14px;font-weight:700;color:#0B3D5B;margin-bottom:6px}
  .popup-info{font-size:12px;color:#6B7280}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([${userLocation ? userLocation.lat : 14.5378},${userLocation ? userLocation.lng : 121.0475}],14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  const riskColors = { safe:'#10B981', moderate:'#F59E0B', high:'#EF4444' };
  (${JSON.stringify(floodZones)}).forEach(z=>{
    const latlngs = z.coordinates.map(c=>[c[1],c[0]]);
    L.polyline(latlngs,{color:riskColors[z.riskLevel],weight:8,opacity:.7,lineCap:'round'}).addTo(map);
  });

  (${JSON.stringify(centers)}).forEach(c=>{
    const m=L.marker([c.latitude,c.longitude],{
      icon:L.divIcon({className:'custom-marker',html:'🏠',iconSize:[36,36],iconAnchor:[18,18]})
    }).addTo(map);
    m.bindPopup('<div class="popup-title">'+c.name+'</div><div class="popup-info">Capacity: '+(c.capacity||'N/A')+' people</div>');
    m.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'centerSelected',center:c})));
  });

  ${userLocation ? `L.marker([${userLocation.lat},${userLocation.lng}],{icon:L.divIcon({className:'user-marker',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);` : ''}

  ${selectedCenter && userLocation ? `L.polyline([[${userLocation.lat},${userLocation.lng}],[${selectedCenter.latitude},${selectedCenter.longitude}]],{color:'#0B5AA2',weight:4,opacity:.9,dashArray:'10, 10'}).addTo(map);` : ''}

  window.fromRN = function(d){
    if(d.type==='zoomIn') map.zoomIn();
    if(d.type==='zoomOut') map.zoomOut();
    if(d.type==='centerMap' && d.lat && d.lng) map.setView([d.lat,d.lng],d.zoom||15,{animate:true});
  };
</script>
</body></html>`;

/* ----------------------------- LegendItem ----------------------------- */
function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendColor, { backgroundColor: color }]} />
      <ThemedText style={styles.legendLabel}>{label}</ThemedText>
    </View>
  );
}

/* ----------------------------- Main Screen ----------------------------- */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webViewRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }
    })();
  }, []);

  const sendToWeb = (data) => {
    const js = `window.fromRN && window.fromRN(${JSON.stringify(data)}); true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const handleZoomIn = () => sendToWeb({ type: 'zoomIn' });
  const handleZoomOut = () => sendToWeb({ type: 'zoomOut' });
  const toggleLegend = () => setShowLegend(prev => !prev);
  const handleCenter = (lat, lng) => sendToWeb({ type: 'centerMap', lat, lng, zoom: 15 });

  const userLoc = location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null;
  const mapHTML = generateMapHTML(EVACUATION_CENTERS, FLOOD_ZONES, userLoc, selectedCenter);

  const overlaySuggestions = EVACUATION_CENTERS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'centerSelected' && msg.center) setSelectedCenter(msg.center);
          } catch {}
        }}
      />

      {/* --- Top Row --- */}
      <View style={[styles.topRow, { top: insets.top + 8 }]}>
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="chevron.left" size={20} color="#0B3D5B" />
        </Pressable>

        {/* Evacuation Centers button */}
        <Pressable
          style={styles.pillButton}
          onPress={() => setShowSearchModal(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open evacuation centers"
        >
          <AppIcon name="mappin.and.ellipse" size={16} color="#0B5AA2" />
          <ThemedText style={styles.pillText}>Evacuation Centers</ThemedText>
        </Pressable>

        {/* Notifications (routes to /notifications) */}
        <Pressable
          onPress={() => router.push('/notifications')}
          style={styles.iconBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
        >
          <AppIcon name="bell.fill" size={18} color="#0B3D5B" />
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>2</ThemedText>
          </View>
        </Pressable>
      </View>

      {/* --- Search Bar & Suggestions --- */}
      <View style={[styles.searchOverlay, { top: insets.top + 58 }]}>
        <View style={styles.searchBox}>
          <AppIcon name="magnifyingglass" size={18} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setShowSuggestions(true); }}
            placeholder="Search place or center"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            accessibilityLabel="Search places or centers"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <AppIcon name="xmark" size={18} color="#64748B" />
            </Pressable>
          )}
        </View>

        {showSuggestions && query.length > 0 && (
          <View style={styles.suggestionsCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {overlaySuggestions.length === 0 ? (
                <View style={styles.suggestionRowEmpty}>
                  <ThemedText style={{ color: '#64748B' }}>No results</ThemedText>
                </View>
              ) : overlaySuggestions.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.suggestionRow}
                  onPress={() => {
                    setSelectedCenter(c);
                    handleCenter(c.latitude, c.longitude);
                    setShowSuggestions(false);
                    setQuery(c.name);
                  }}
                >
                  <AppIcon name="paperplane.fill" size={16} color="#0B5AA2" />
                  <ThemedText style={styles.suggestionText}>{c.name}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* --- Evacuation Centers Modal --- */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowSearchModal(false)} style={{ marginRight: 12 }} hitSlop={8}>
              <AppIcon name="chevron.left" size={24} color="#1a1a1a" />
            </Pressable>
            <ThemedText style={styles.modalTitle}>Evacuation Centers</ThemedText>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {EVACUATION_CENTERS.map((center) => (
              <Pressable
                key={center.id}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCenter(center);
                  handleCenter(center.latitude, center.longitude);
                  setShowSearchModal(false);
                }}
              >
                <AppIcon name="house.fill" size={20} color="#0B5AA2" />
                <View style={{ marginLeft: 10 }}>
                  <ThemedText style={styles.modalItemText}>{center.name}</ThemedText>
                  <ThemedText style={styles.modalItemSub}>{center.capacity} capacity</ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* --- Legend --- */}
      <Pressable style={styles.legendContainer} onPress={toggleLegend} accessibilityLabel="Toggle flood legend">
        <View style={styles.legendHeader}>
          <ThemedText style={styles.legendTitle}>Flood Legend</ThemedText>
          <AppIcon name={showLegend ? 'xmark' : 'plus'} size={20} color="#1a1a1a" />
        </View>
        {showLegend && (
          <View style={styles.legendContent}>
            <LegendItem color="#10B981" label="Safest" />
            <LegendItem color="#F59E0B" label="Moderate Risk" />
            <LegendItem color="#EF4444" label="High Risk" />
          </View>
        )}
      </Pressable>

      {/* --- Zoom --- */}
      <View style={styles.mapControls}>
        <Pressable style={styles.iconBtn} onPress={handleZoomIn} hitSlop={8} accessibilityLabel="Zoom in">
          <ThemedText style={styles.controlText}>+</ThemedText>
        </Pressable>
        <Pressable style={[styles.iconBtn, { marginTop: 8 }]} onPress={handleZoomOut} hitSlop={8} accessibilityLabel="Zoom out">
          <ThemedText style={styles.controlText}>−</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

/* ----------------------------- Styles ----------------------------- */
const OUTLINE = '#E6EEF5';

const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  map: { flex: 1 },

  topRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: OUTLINE,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SHADOW,
  },

  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: OUTLINE,
    ...SOFT_SHADOW,
  },

  pillText: { fontSize: 14, fontWeight: '700', color: '#0B5AA2' },

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

  searchOverlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 25 },
  searchBox: {
    width: '86%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: OUTLINE,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...SOFT_SHADOW,
  },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 14, color: '#0f172a' },

  suggestionsCard: {
    width: '86%',
    maxWidth: 520,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OUTLINE,
    maxHeight: 210,
    ...SOFT_SHADOW,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionRowEmpty: { padding: 10, alignItems: 'center' },
  suggestionText: { color: '#0f172a' },

  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  modalItemSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  mapControls: { position: 'absolute', bottom: 100, right: 12 },
  controlText: { fontSize: 20, fontWeight: '700', color: '#0B5AA2', lineHeight: 20 },

  legendContainer: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: OUTLINE,
    ...SOFT_SHADOW,
    minWidth: 160,
  },
  legendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  legendContent: { marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  legendColor: { width: 24, height: 16, borderRadius: 4, marginRight: 8 },
  legendLabel: { fontSize: 13, color: '#374151' },
});
