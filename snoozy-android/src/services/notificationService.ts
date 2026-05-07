import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import type { BedtimeValue } from '@/screens/BedtimeReminderScreen'

export const NOTIFICATION_ID_KEY = 'snoozy_bedtime_notif_id'

// expo-notifications is unsupported in Expo Go — all calls are no-ops there
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false

  if (Platform.OS === 'android') {
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
  if (isExpoGo) return

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

  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id)
}

export async function cancelBedtimeNotification(): Promise<void> {
  if (isExpoGo) return

  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
  const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY)
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id)
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY)
  }
}
