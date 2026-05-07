import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { BedtimeValue } from '@/screens/BedtimeReminderScreen'

const NOTIFICATION_ID_KEY = 'snoozy_bedtime_notif_id'

// Controls how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ (API 33+) requires explicit runtime permission
    await Notifications.setNotificationChannelAsync('bedtime', {
      name: 'Bedtime Reminder',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleBedtimeNotification(bedtime: BedtimeValue): Promise<void> {
  await cancelBedtimeNotification()

  let hour = bedtime.hour
  if (bedtime.period === 'PM' && hour !== 12) hour += 12
  if (bedtime.period === 'AM' && hour === 12) hour = 0

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Time for a bedtime story!',
      body: "Tonight's adventure is ready. Tap to start the magic.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: bedtime.minute,
    },
  })

  // Persist the notification ID so we can cancel it later
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id)
}

export async function cancelBedtimeNotification(): Promise<void> {
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY)
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id)
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY)
  }
}

export { NOTIFICATION_ID_KEY }
