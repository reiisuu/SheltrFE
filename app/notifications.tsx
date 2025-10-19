// app/notifications.jsx
import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  FlatList,
  Modal,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

/* --------- Cross-platform icon wrapper (iOS: SF Symbols, Android: Ionicons) --------- */
type AppIconProps = { name: string; size?: number; color?: string };
function AppIcon({ name, size = 18, color = '#000' }: AppIconProps) {
  if (Platform.OS === 'ios') {
    return <IconSymbol name={name as any} size={size as any} color={color as any} />;
  }
  const map: Record<string, string> = {
    'chevron.left': 'chevron-back',
    ellipsis: 'ellipsis-vertical',
    'checkmark.circle.fill': 'checkmark-circle',
    'trash.fill': 'trash',
    checkmark: 'checkmark',
    'exclamationmark.triangle.fill': 'warning',
  };
  return <Ionicons name={(map[name] || 'ellipse') as any} size={size as any} color={color as any} />;
}

/* ---------------------------- Seed data ---------------------------- */
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

/* Keep content above your floating tab bar */
const TABBAR_CLEARANCE = 100;
const OUTLINE = '#E6EEF5';
const ICON_COLOR = '#0B3D5B';
const ACCENT_BLUE = '#0B5AA2';
const NEUTRAL = '#64748B';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Hide native header (removes black bar)
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  type Notification = typeof seed[number];
  type SelectedMap = { [id: string]: boolean };
  const [items, setItems] = useState<Notification[]>(seed);
  const [menu, setMenu] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Multiselect
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selected, setSelected] = useState<SelectedMap>({}); // { [id]: true }

  const openMenu = (id: string) => setMenu({ open: true, id });
  const closeMenu = () => setMenu({ open: false, id: null });

  // Single-item actions
  const markAsRead = (id: string | null) => {
    if (!id) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    closeMenu();
  };

  const deleteItem = (id: string | null) => {
    if (!id) return;
    Alert.alert('Delete notification?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((n) => n.id !== id));
          closeMenu();
        },
      },
    ]);
  };

  const toggleRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  // Multi-select helpers
  const isSelected = (id: string) => !!selected[id];
  const toggleSelected = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const clearSelection = () => setSelected({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // Bulk actions
  const markSelectedRead = () => {
    if (!selectedIds.length) return;
    setItems((prev) => prev.map((n) => (selected[n.id] ? { ...n, read: true } : n)));
    clearSelection();
    setSelectMode(false);
  };
  const deleteSelected = () => {
    if (!selectedIds.length) return;
    Alert.alert('Delete selected?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((n) => !selected[n.id]));
          clearSelection();
          setSelectMode(false);
        },
      },
    ]);
  };

  const renderSeverityIcon = (sev: string) => {
    const color = sev === 'danger' ? ACCENT_BLUE : '#F59E0B';
    return (
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: color + '1A', borderColor: color + '33' },
        ]}
      >
        <AppIcon name="exclamationmark.triangle.fill" size={18} color={color} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const selectedStyle = selectMode && isSelected(item.id) ? { borderColor: ACCENT_BLUE } : null;

    return (
      <Pressable
        style={[styles.card, selectedStyle]}
        onPress={() => (selectMode ? toggleSelected(item.id) : toggleRead(item.id))}
        onLongPress={() => {
          if (!selectMode) setSelectMode(true);
          toggleSelected(item.id);
        }}
      >
        <View style={styles.cardHeader}>
          {selectMode ? (
            <View style={[styles.checkbox, isSelected(item.id) && styles.checkboxChecked]}>
              {isSelected(item.id) && <AppIcon name="checkmark" size={12} color="#FFFFFF" />}
            </View>
          ) : (
            renderSeverityIcon(item.severity)
          )}

          <View style={{ flex: 1 }}>
            <ThemedText
              style={[styles.cardTitle, item.read && { color: '#6B7280' }]}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            <ThemedText style={styles.cardBody} numberOfLines={3}>
              {item.body}
            </ThemedText>
            <ThemedText style={styles.cardTime}>{item.timeAgo}</ThemedText>
          </View>

          {!selectMode && (
            <Pressable onPress={() => openMenu(item.id)} hitSlop={10}>
              <AppIcon name="ellipsis" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  // Reserve only for the fixed top row (never changes)
  const HEADER_RESERVED = insets.top + 56;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top row (same style as map.jsx) */}
      <View style={[styles.topRow, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <AppIcon name="chevron.left" size={20} color={ICON_COLOR} />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>

        <Pressable
          onPress={() => {
            if (selectMode) clearSelection();
            setSelectMode(!selectMode);
          }}
          style={styles.editPill}
          hitSlop={8}
        >
          <ThemedText style={styles.editPillText}>{selectMode ? 'Done' : 'Edit'}</ThemedText>
        </Pressable>
      </View>

      {/* Spacer under the fixed header (constant height, no jumps) */}
      <View style={{ height: HEADER_RESERVED }} />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TABBAR_CLEARANCE + 60 },
        ]}
        showsVerticalScrollIndicator={false}
        extraData={{ selectMode, selected }}
        ListFooterComponent={<View style={{ height: 0 }} />}
      />

      {/* Bottom fixed bulk bar (appears over content; doesn't reflow the list) */}
      {selectMode && (
        <View style={[styles.bulkBarBottom, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable style={[styles.bulkBtn, styles.bulkPrimary]} onPress={markSelectedRead}>
            <AppIcon name="checkmark.circle.fill" size={16} color="#FFFFFF" />
            <ThemedText style={styles.bulkPrimaryText}>Mark as read</ThemedText>
          </Pressable>
          <Pressable style={[styles.bulkBtn, styles.bulkNeutral]} onPress={deleteSelected}>
            <AppIcon name="trash.fill" size={16} color="#FFFFFF" />
            <ThemedText style={styles.bulkNeutralText}>Delete</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Context Menu (no dim overlay) */}
      <Modal visible={menu.open} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.menuContainer}>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={() => markAsRead(menu.id)}>
              <AppIcon name="checkmark.circle.fill" size={16} color={ACCENT_BLUE} />
              <ThemedText style={styles.menuText}>Mark as read</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}
              onPress={() => deleteItem(menu.id)}
            >
              <AppIcon name="trash.fill" size={16} color={NEUTRAL} />
              <ThemedText style={[styles.menuText, { color: NEUTRAL }]}>Delete</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SOFT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Top row (map-like) */
  topRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 20,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: ICON_COLOR,
  },
  editPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: OUTLINE,
    ...SOFT_SHADOW,
  },
  editPillText: { fontSize: 13, fontWeight: '800', color: ICON_COLOR },

  /* List */
  listContent: { paddingHorizontal: 16 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EEF5',
    ...SOFT_SHADOW,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },

  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  /* Checkbox for selection mode */
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: ACCENT_BLUE, borderColor: ACCENT_BLUE },

  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0B3D5B', marginBottom: 4 },
  cardBody: { color: '#475569', fontSize: 14, lineHeight: 18 },
  cardTime: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },

  /* Bottom bulk bar (fixed) */
  bulkBarBottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: TABBAR_CLEARANCE, // sits above your floating tab bar
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: OUTLINE,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...SOFT_SHADOW,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 5,
  },
  bulkPrimary: { backgroundColor: ACCENT_BLUE },
  bulkNeutral: { backgroundColor: NEUTRAL },
  bulkPrimaryText: { color: '#FFFFFF', fontWeight: '800' },
  bulkNeutralText: { color: '#FFFFFF', fontWeight: '800' },

  /* Popover menu (no dim overlay) */
  menuContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  menuCard: {
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
