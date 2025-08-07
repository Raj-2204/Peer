# Collaborative Diagramming Features

This document outlines the new collaborative diagramming features added to the Peer Programming application.

## Overview

The application now includes a comprehensive collaborative diagramming system similar to draw.io, allowing users to create and share visual diagrams in real-time during their coding sessions.

## Features Implemented

### ✅ Core Functionality
- **Real-time Collaboration**: Multiple users can edit diagrams simultaneously with live updates
- **Socket.IO Integration**: Seamless real-time synchronization using existing WebSocket infrastructure
- **View Toggle**: Switch between Code Editor and Diagram views with a simple toggle
- **Persistent State**: Diagram data is stored per room and persists during the session

### ✅ Diagram Tools
- **Node Creation**: Add different types of nodes (Start, Process, End)
- **Edge Connections**: Draw connections between nodes with drag-and-drop
- **Interactive Canvas**: Pan, zoom, and navigate the diagram canvas
- **Selection & Editing**: Select and modify nodes and edges
- **Clear Function**: Reset the entire diagram

### ✅ Pre-built Templates
1. **Empty Canvas** - Start with a blank diagram
2. **Basic Flowchart** - Simple process flow with connected nodes
3. **ER Diagram** - Database entity relationship template
4. **User Story Map** - User journey and story mapping template
5. **System Architecture** - High-level system components diagram
6. **Agile Workflow** - Sprint planning and workflow visualization

### ✅ UI/UX Features
- **Dark Theme Integration**: Matches the existing application design
- **Responsive Design**: Works on desktop and mobile devices
- **Connection Status**: Shows real-time connection status
- **Template Gallery**: Easy-to-browse template selection
- **Tool Panel**: Built-in controls for adding nodes and managing the diagram

## Technical Implementation

### Backend (Server-side)
- **Socket.IO Handlers**: New event handlers for diagram synchronization
  - `join-diagram` - Join diagram room
  - `diagram-change` - Broadcast full diagram changes
  - `diagram-node-change` - Sync individual node changes
  - `diagram-edge-change` - Sync individual edge changes
  - `diagram-viewport-change` - Sync canvas viewport changes

### Frontend (Client-side)
- **React Flow Integration**: Using React Flow library for diagram rendering
- **Real-time Sync**: Throttled updates to prevent spam (10 updates/second max)
- **State Management**: Proper state synchronization between users
- **Component Architecture**: Modular design with separate components for diagrams and templates

### Data Structure
```javascript
// Room diagram data structure
{
  nodes: [
    {
      id: 'unique-id',
      type: 'default|input|output',
      position: { x: 100, y: 100 },
      data: { label: 'Node Label' },
      style: { /* custom styles */ }
    }
  ],
  edges: [
    {
      id: 'unique-id',
      source: 'node-id',
      target: 'node-id',
      label: 'optional label',
      type: 'default|smoothstep'
    }
  ],
  viewport: { x: 0, y: 0, zoom: 1 }
}
```

## Use Cases

### 1. Database Schema Design
- Create ER diagrams to visualize database relationships
- Define entities, attributes, and relationships
- Share database design with team members in real-time

### 2. User Story Mapping
- Map user journeys and story flows
- Organize features and epics visually
- Collaborative sprint planning sessions

### 3. System Architecture Planning
- Design high-level system components
- Document API connections and data flows
- Share architectural decisions with stakeholders

### 4. Process Flow Documentation
- Create flowcharts for business processes
- Document development workflows
- Visualize decision trees and logic flows

### 5. Agile Workflow Visualization
- Track sprint progress visually
- Document team processes
- Create workflow templates for consistency

## Getting Started

1. **Access the Diagram View**: 
   - Join any room in the application
   - Click the "📊 Diagram" button to switch to diagram view

2. **Create Your First Diagram**:
   - Click "📋 Templates" to choose from pre-built templates
   - Or start with "⬜ Empty Canvas" for a blank diagram
   - Use the tool panel to add nodes and connections

3. **Collaborate**:
   - Other users in the room can see your changes in real-time
   - The connection status indicator shows sync status
   - All changes are automatically saved to the room

## Future Enhancements

### Potential Improvements
- **Custom Node Types**: Add specialized node types for specific use cases
- **Export Functionality**: Export diagrams as PNG, SVG, or PDF
- **Import Support**: Import diagrams from other tools
- **Version History**: Track diagram changes over time
- **Comments & Annotations**: Add comments to specific nodes/edges
- **Advanced Templates**: More specialized templates for different domains
- **Collaborative Cursors**: Show other users' cursor positions
- **Voice Integration**: Voice comments on specific diagram elements

### Technical Enhancements
- **Offline Support**: Cache diagrams locally for offline editing
- **Undo/Redo**: Implement history management
- **Performance Optimization**: Virtual rendering for large diagrams
- **Security**: Add permission controls for diagram editing
- **Integration**: Connect with external tools (Figma, Lucidchart, etc.)

## Testing

To test the collaborative diagramming functionality:

1. Start the backend server: `npm start` (in server directory)
2. Start the frontend: `npm run dev` (in client directory)
3. Open multiple browser tabs/windows to the same room
4. Switch to diagram view and test real-time collaboration
5. Try different templates and verify synchronization

## Conclusion

The collaborative diagramming feature significantly enhances the Peer Programming application by providing a visual collaboration tool that complements the existing code editing capabilities. Users can now seamlessly switch between coding and diagramming, making it easier to plan, design, and document their projects collaboratively.