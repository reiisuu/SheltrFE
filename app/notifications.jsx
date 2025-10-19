import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

const seed = [
  {
    id: '1',
    title: 'Heavy Rain Warning',
    body: 'Possible flooding in low-lying areas. Avoid unnecessary travel.',
    timeAgo: '31 minutes ago',
    severity: 'warning',
    read: false,
  },
  {
    id: '2',
    title: 'Evacuate Immediately',
    body: 'Floodwaters rising in your area. Head to the nearest evacuation center now.',
    timeAgo: '3 weeks ago',
    severity: 'danger',
    read: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(seed);
  const [menu, setMenu] = useState({ open: false, id: null });

  const openMenu = (id) => setMenu({ open: true, id });
  const closeMenu = () => setMenu({ open: false, id: null });

  const markAsRead = (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    closeMenu();
  };
  const deleteItem = (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    closeMenu();
  };

  const renderIcon = (sev) => {
    const color = sev === 'danger' ? '#EF4444' : '#F59E0B';
    return (
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: color + '1A', borderColor: color + '33' },
        ]}
      >
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color={color} />
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {renderIcon(item.severity)}
        <View style={{ flex: 1 }}>
          <ThemedText
            style={[styles.cardTitle, item.read && { color: '#6B7280' }]}
          >
            {item.title}
          </ThemedText>
          <ThemedText style={styles.cardBody}>{item.body}</ThemedText>
          <ThemedText style={styles.cardTime}>{item.timeAgo}</ThemedText>
        </View>

        <Pressable onPress={() => openMenu(item.id)} hitSlop={10}>
          <IconSymbol name="ellipsis" size={18} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 8 }]}
        hitSlop={10}
      >
        <IconSymbol name="chevron.left" size={22} color="#0B3D5B" />
      </Pressable>

      {/* Header */}
      <ThemedText style={[styles.title, { marginTop: insets.top + 50 }]}>
        Notifications
      </ThemedText>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Context Menu */}
      <Modal visible={menu.open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={() => markAsRead(menu.id)}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#0B5AA2" />
            <ThemedText style={styles.menuText}>Mark as read</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}
            onPress={() => deleteItem(menu.id)}
          >
            <IconSymbol name="trash.fill" size={16} color="#EF4444" />
            <ThemedText style={[styles.menuText, { color: '#EF4444' }]}>Delete</ThemedText>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */
const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },

  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5EAF2',
    ...SOFT_SHADOW,
  },

  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: '#0B3D5B',
    marginBottom: 16,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EEF5',
    ...SOFT_SHADOW,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B3D5B',
    marginBottom: 4,
  },
  cardBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 18,
  },
  cardTime: {
    marginTop: 6,
    fontSize: 12,
    color: '#9CA3AF',
  },

  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  menuCard: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 180,
    ...SOFT_SHADOW,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuText: { marginLeft: 8, fontSize: 14, color: '#111827', fontWeight: '600' },
});
