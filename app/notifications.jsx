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

/* ------------ Icon bridge (same pattern as map.jsx) ------------ */
function AppIcon({ name, size, color }) {
  if (Platform.OS === 'ios') {
    return <IconSymbol name={name} size={size} color={color} />;
  }
  const map = {
    'chevron.left': 'chevron-back',
    'ellipsis': 'ellipsis-vertical',
    'checkmark.circle.fill': 'checkmark-circle',
    'trash.fill': 'trash',
  };
  return <Ionicons name={map[name] || name} size={size} color={color} />;
}

/* ---------------------------- Seed data ---------------------------- */
const seed = [
  { id: '1', title: 'Heavy Rain Warning', body: 'Possible flooding in low-lying areas. Avoid unnecessary travel.', timeAgo: '31 minutes ago', severity: 'warning', read: false },
  { id: '2', title: 'Evacuate Immediately', body: 'Floodwaters rising in your area. Head to the nearest evacuation center now.', timeAgo: '3 weeks ago', severity: 'danger', read: false },
];

/* Keep content above your floating tab bar */
const TABBAR_HEIGHT = 30;
const TABBAR_BOTTOM_MARGIN = 5;
const EXTRA_CUSHION = 1;
const BOTTOM_CLEARANCE = TABBAR_HEIGHT + TABBAR_BOTTOM_MARGIN + EXTRA_CUSHION;

const OUTLINE = '#E6EEF5';
const ICON_COLOR = '#0B3D5B';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Hide native header (removes black bar)
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [items, setItems] = useState(seed);
  const [menu, setMenu] = useState({ open: false, id: null });

  // Multiselect
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({}); // { [id]: true }

  const openMenu = (id) => setMenu({ open: true, id });
  const closeMenu = () => setMenu({ open: false, id: null });

  // Single-item actions
  const markAsRead = (id) => {
    if (!id) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    closeMenu();
  };
  const deleteItem = (id) => {
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
  const toggleRead = (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  // Multi-select helpers
  const isSelected = (id) => !!selected[id];
  const toggleSelected = (id) => setSelected((p) => ({ ...p, [id]: !p[id] }));
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

  const renderSeverityIcon = (sev) => {
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

  const renderItem = ({ item }) => {
    const selectedStyle = selectMode && isSelected(item.id) ? { borderColor: '#0B5AA2' } : null;

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
              {isSelected(item.id) && <IconSymbol name="checkmark" size={12} color="#FFFFFF" />}
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top row (same visual style as map.jsx) */}
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

      {/* Spacer under header / bulk bar */}
      {selectMode ? (
        <View style={[styles.bulkBar, { marginTop: insets.top + 56 }]}>
          <Pressable style={[styles.bulkBtn, styles.bulkPrimary]} onPress={markSelectedRead}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
            <ThemedText style={styles.bulkPrimaryText}>Mark as read</ThemedText>
          </Pressable>
          <Pressable style={[styles.bulkBtn, styles.bulkDanger]} onPress={deleteSelected}>
            <IconSymbol name="trash.fill" size={16} color="#FFFFFF" />
            <ThemedText style={styles.bulkDangerText}>Delete</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: insets.top + 56 }} />
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        extraData={{ selectMode, selected }}
        ListFooterComponent={<View style={{ height: BOTTOM_CLEARANCE }} />}
      />

      {/* Context Menu (no dark backdrop) */}
      <Modal visible={menu.open} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.menuContainer}>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={() => markAsRead(menu.id)}>
              <AppIcon name="checkmark.circle.fill" size={16} color="#0B5AA2" />
              <ThemedText style={styles.menuText}>Mark as read</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}
              onPress={() => deleteItem(menu.id)}
            >
              <AppIcon name="trash.fill" size={16} color="#EF4444" />
              <ThemedText style={[styles.menuText, { color: '#EF4444' }]}>Delete</ThemedText>
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

  /* Bulk bar */
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginHorizontal: 5,
  },
  bulkPrimary: { backgroundColor: '#0B5AA2' },
  bulkDanger: { backgroundColor: '#EF4444' },
  bulkPrimaryText: { color: '#FFFFFF', fontWeight: '800' },
  bulkDangerText: { color: '#FFFFFF', fontWeight: '800' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

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
  checkboxChecked: { backgroundColor: '#0B5AA2', borderColor: '#0B5AA2' },

  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0B3D5B', marginBottom: 4 },
  cardBody: { color: '#475569', fontSize: 14, lineHeight: 18 },
  cardTime: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },

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
