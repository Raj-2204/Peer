// User color assignment system for collaborative editing
export const USER_COLORS = [
  { primary: '#FF6B6B', secondary: '#FFE0E0', name: 'Red' },      // Red
  { primary: '#4ECDC4', secondary: '#E0F7F6', name: 'Teal' },     // Teal  
  { primary: '#45B7D1', secondary: '#E0F4FF', name: 'Blue' },     // Blue
  { primary: '#96CEB4', secondary: '#F0F9F4', name: 'Green' },    // Green
  { primary: '#FFEAA7', secondary: '#FFFEF0', name: 'Yellow' },   // Yellow
  { primary: '#DDA0DD', secondary: '#F5E6F5', name: 'Purple' },   // Purple
  { primary: '#FFB347', secondary: '#FFF2E0', name: 'Orange' },   // Orange
  { primary: '#F06292', secondary: '#FCE4EC', name: 'Pink' },     // Pink
  { primary: '#AED581', secondary: '#F1F8E9', name: 'Lime' },     // Lime
  { primary: '#64B5F6', secondary: '#E3F2FD', name: 'Sky' },      // Sky Blue
]

// Track assigned colors to avoid duplicates in same room
const roomColorAssignments = new Map()

export const getUserColor = (roomId, userId) => {
  const roomKey = `${roomId}-${userId}`
  
  // Check if user already has a color assigned
  if (roomColorAssignments.has(roomKey)) {
    return roomColorAssignments.get(roomKey)
  }
  
  // Get colors already assigned in this room
  const roomUsers = Array.from(roomColorAssignments.keys())
    .filter(key => key.startsWith(roomId + '-'))
    .map(key => roomColorAssignments.get(key))
  
  // Find first available color
  const assignedColorIndexes = roomUsers.map(color => 
    USER_COLORS.findIndex(c => c.primary === color.primary)
  )
  
  let colorIndex = 0
  while (assignedColorIndexes.includes(colorIndex) && colorIndex < USER_COLORS.length) {
    colorIndex++
  }
  
  // If all colors are taken, cycle back to start
  if (colorIndex >= USER_COLORS.length) {
    colorIndex = assignedColorIndexes.length % USER_COLORS.length
  }
  
  const assignedColor = USER_COLORS[colorIndex]
  roomColorAssignments.set(roomKey, assignedColor)
  
  return assignedColor
}

export const removeUserColor = (roomId, userId) => {
  const roomKey = `${roomId}-${userId}`
  roomColorAssignments.delete(roomKey)
}

export const getUsersInRoom = (roomId) => {
  return Array.from(roomColorAssignments.keys())
    .filter(key => key.startsWith(roomId + '-'))
    .map(key => ({
      userId: key.split('-')[1],
      color: roomColorAssignments.get(key)
    }))
}