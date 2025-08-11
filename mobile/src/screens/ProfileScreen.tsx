import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const profileItems = [
    { title: 'Student ID', value: 'STU001', icon: 'card-outline' },
    { title: 'Department', value: 'Computer Science', icon: 'school-outline' },
    { title: 'Semester', value: '6th Semester', icon: 'calendar-outline' },
    { title: 'Batch Year', value: '2021', icon: 'time-outline' },
  ];

  const menuItems = [
    { title: 'Edit Profile', icon: 'person-outline', action: () => {} },
    { title: 'Attendance History', icon: 'list-outline', action: () => {} },
    { title: 'Notifications', icon: 'notifications-outline', action: () => {} },
    { title: 'Settings', icon: 'settings-outline', action: () => {} },
    { title: 'Help & Support', icon: 'help-circle-outline', action: () => {} },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>{user?.name || 'John Doe'}</Text>
        <Text style={styles.email}>{user?.email || 'john.doe@example.com'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        {profileItems.map((item, index) => (
          <View key={index} style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name={item.icon as any} size={20} color="#6b7280" />
              <Text style={styles.profileItemTitle}>{item.title}</Text>
            </View>
            <Text style={styles.profileItemValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.action}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={20} color="#6b7280" />
              <Text style={styles.menuItemTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 2.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemTitle: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  profileItemValue: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  version: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default ProfileScreen;