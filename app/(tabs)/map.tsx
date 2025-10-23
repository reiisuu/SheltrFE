// app/(tabs)/map.tsx
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

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
function AppIcon({ name, size, color }: { name: string; size: number; color: string }) {
  if (Platform.OS === 'ios') {
    return <IconSymbol name={name} size={size} color={color} />;
  }
  const map: Record<string, any> = {
    'chevron.left': 'chevron-back',
    'bell.fill': 'notifications',
    'magnifyingglass': 'search',
    'xmark': 'close',
    'paperplane.fill': 'send',
    'mappin.and.ellipse': 'location',
  };
  return <Ionicons name={map[name] ?? name} size={size} color={color} />;
}

/* ----------------------------- Map HTML ----------------------------- */
const generateMapHTML = (
  centers: typeof EVACUATION_CENTERS,
  floodZones: typeof FLOOD_ZONES,
  userLocation: { lat: number; lng: number } | null
) => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css"/>
<style>
  html,body,#map{height:100%;margin:0}
  .custom-marker{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  .user-marker{background:#3B82F6;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3)}
  .popup-title{font-size:14px;font-weight:700;color:#0B3D5B;margin-bottom:6px}
  .popup-info{font-size:12px;color:#6B7280}
  .leaflet-routing-container{display:none}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
<script>
  const map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([${userLocation ? userLocation.lat : 14.5378},${userLocation ? userLocation.lng : 121.0475}],14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  // Flood polylines
  const riskColors = { safe:'#10B981', moderate:'#F59E0B', high:'#EF4444' };
  (${JSON.stringify(floodZones)}).forEach(z=>{
    const latlngs = z.coordinates.map(c=>[c[1],c[0]]);
    L.polyline(latlngs,{color:riskColors[z.riskLevel],weight:8,opacity:.7,lineCap:'round'}).addTo(map);
  });

  // Centers with SVG icon
  (${JSON.stringify(centers)}).forEach(c=>{
    const m=L.marker([c.latitude,c.longitude],{
      icon:L.divIcon({
        className:'custom-marker',
        html:\`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
            <circle cx="12" cy="12" r="11" fill="#10B981" stroke="white" stroke-width="2"/>
            <path d="M6 15v-3l6-4 6 4v3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="9" y="12" width="6" height="6" fill="white" stroke="none"/>
          </svg>\`,
        iconSize:[36,36],
        iconAnchor:[18,18]
      })
    }).addTo(map);
    m.bindPopup('<div class="popup-title">'+c.name+'</div><div class="popup-info">Capacity: '+(c.capacity||'N/A')+' people</div>');
    m.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'centerSelected',center:c})));
  });

  // User marker
  const user = ${userLocation ? JSON.stringify(userLocation) : 'null'};
  if (user){
    L.marker([user.lat,user.lng],{icon:L.divIcon({className:'user-marker',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);
  }

  // Routing setup
  let routing = null;

  function routerFor(profile){
    if(profile === 'cycling') return L.Routing.osrmv1({
      serviceUrl: 'https://router.openstreetmap.de/routed-bike/route/v1', profile: 'bike'
    });
    if(profile === 'foot') return L.Routing.osrmv1({
      serviceUrl: 'https://router.openstreetmap.de/routed-foot/route/v1', profile: 'foot'
    });
    return L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'car'
    });
  }

  function ensureRouting(profile){
    if(!routing){
      routing = L.Routing.control({
        waypoints: [],
        router: routerFor(profile || 'driving'),
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        fitSelectedRoutes: true,
        lineOptions: { styles: [{ color:'#16A34A', opacity:0.95, weight:5 }] }
      }).addTo(map);
    }else{
      routing.options.router = routerFor(profile || 'driving');
    }
  }

  function routeTo(destLat, destLng, profile){
    if(!user) return;
    ensureRouting(profile);
    routing.setWaypoints([
      L.latLng(user.lat,user.lng),
      L.latLng(destLat,destLng)
    ]);
  }

  window.fromRN = function(d){
    if(!d) return;
    if(d.type==='routeTo') routeTo(d.lat,d.lng,d.profile||'driving');
    if(d.type==='clearRoute' && routing) routing.setWaypoints([]);
  };
</script>
</body></html>`;

/* ----------------------------- Main Screen ----------------------------- */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      }
    })();
  }, []);

  const sendToWeb = (data: any) => {
    const js = `window.fromRN && window.fromRN(${JSON.stringify(data)}); true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const handleRouteTo = (lat: number, lng: number) =>
    sendToWeb({ type: 'routeTo', lat, lng, profile: 'driving' });

  const userLoc = location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null;
  const mapHTML = generateMapHTML(EVACUATION_CENTERS, FLOOD_ZONES, userLoc);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'centerSelected' && msg.center) {
              handleRouteTo(msg.center.latitude, msg.center.longitude);
            }
          } catch {}
        }}
      />
      {/* Header buttons */}
      <View style={[styles.topRow, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <AppIcon name="chevron.left" size={20} color="#0B3D5B" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Evacuation Map</ThemedText>
        <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}>
          <AppIcon name="bell.fill" size={18} color="#0B3D5B" />
        </Pressable>
      </View>
    </View>
  );
}

/* ----------------------------- Styles ----------------------------- */
const OUTLINE = '#E6EEF5';
const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  topRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: OUTLINE,
    alignItems: 'center',
    justifyContent: 'center',
    ...SOFT_SHADOW,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0B3D5B',
  },
});
