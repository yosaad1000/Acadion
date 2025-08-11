import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen: React.FC = () => {
  const stats = [
    { title: 'Total Classes', value: '24', icon: 'book-outline', color: '#3b82f6' },
    { title: 'Present', value: '20', icon: 'checkmark-circle-outline', color: '#10b981' },
    { title: 'Absent', value: '4', icon: 'close-circle-outline', color: '#ef4444' },
    { title: 'Attendance Rate', value: '83%', icon: 'stats-chart-outline', color: '#8b5cf6' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.name}>John Doe</Text>
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <TouchableOpacity key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
              <Ionicons name={stat.icon as any} size={24} color="#fff" />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Attendance Marked</Text>
            <Text style={styles.activitySubtitle}>Mathematics - Today 9:00 AM</Text>
          </View>
        </View>
        
        <View style={styles.activityCard}>
          <View style={styles.activityIcon}>
            <Ionicons name="document-text" size={20} color="#3b82f6" />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>Assignment Due</Text>
            <Text style={styles.activitySubtitle}>Physics Lab Report - Tomorrow</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="camera" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Mark Attendance</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>View Schedule</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
});

export default DashboardScreen;