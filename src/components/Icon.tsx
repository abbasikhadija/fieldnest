export function Icon({ name, size = 22 }: { name: 'home' | 'work' | 'activity' | 'settings' | 'arrow' | 'leaf'; size?: number }) {
  const paths = {
    home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
    work: 'M8 5V3h8v2M5 5h14v16H5ZM9 10h6M9 14h6M9 18h3',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    leaf: 'M5 19C2 9 9 3 20 4c1 11-5 18-15 15Zm0 0L16 8',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
