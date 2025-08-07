import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import DiagramTemplates from './DiagramTemplates';
import { RectangleNode, CircleNode, DiamondNode, TextNode, ArrowNode, DatabaseNode } from './DiagramNodes';

const nodeTypes = {
  rectangle: RectangleNode,
  circle: CircleNode,
  diamond: DiamondNode,
  text: TextNode,
  arrow: ArrowNode,
  database: DatabaseNode
};

const edgeTypes = {
  // Custom edge types can be added here in the future
};

function DiagramCanvas({ roomId, socket, isVisible }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();
  const [isConnected, setIsConnected] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#007acc');
  const lastUpdateRef = useRef(0);

  // Initialize socket connection for diagram
  useEffect(() => {
    if (!socket || !isVisible) return;

    console.log('🎨 Connecting to diagram room:', roomId);
    
    // Join diagram room
    socket.emit('join-diagram', roomId);
    
    // Listen for diagram state from server
    const handleDiagramState = (diagramData) => {
      console.log('🎨 Received diagram state:', diagramData);
      if (diagramData && Array.isArray(diagramData.nodes)) {
        setNodes(diagramData.nodes || []);
        setEdges(diagramData.edges || []);
        
        // Set viewport if provided
        if (diagramData.viewport && reactFlowInstance) {
          const { x, y, zoom } = diagramData.viewport;
          reactFlowInstance.setViewport({ x, y, zoom });
        }
      }
      setIsConnected(true);
    };

    // Listen for real-time diagram changes from other users
    const handleDiagramChange = (data) => {
      console.log('🎨 Received diagram change from other user:', data);
      if (data && Array.isArray(data.nodes)) {
        setNodes(data.nodes);
        setEdges(data.edges);
        
        if (data.viewport && reactFlowInstance) {
          const { x, y, zoom } = data.viewport;
          reactFlowInstance.setViewport({ x, y, zoom });
        }
      }
    };

    socket.on('diagram-state', handleDiagramState);
    socket.on('diagram-change', handleDiagramChange);

    // Connection status
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('diagram-state', handleDiagramState);
      socket.off('diagram-change', handleDiagramChange);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, roomId, setNodes, setEdges, reactFlowInstance, isVisible]);

  // Throttled function to emit diagram changes
  const emitDiagramChange = useCallback((currentNodes, currentEdges) => {
    if (!socket || !isConnected) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return; // Throttle to 10 updates per second
    lastUpdateRef.current = now;

    const viewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };
    
    socket.emit('diagram-change', {
      roomId,
      nodes: currentNodes,
      edges: currentEdges,
      viewport
    });
  }, [socket, roomId, reactFlowInstance, isConnected]);

  // Handle node changes
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    
    // Get updated nodes after changes
    setTimeout(() => {
      const currentNodes = reactFlowInstance?.getNodes() || [];
      const currentEdges = reactFlowInstance?.getEdges() || [];
      emitDiagramChange(currentNodes, currentEdges);
    }, 0);
  }, [onNodesChange, emitDiagramChange, reactFlowInstance]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    
    // Get updated edges after changes
    setTimeout(() => {
      const currentNodes = reactFlowInstance?.getNodes() || [];
      const currentEdges = reactFlowInstance?.getEdges() || [];
      emitDiagramChange(currentNodes, currentEdges);
    }, 0);
  }, [onEdgesChange, emitDiagramChange, reactFlowInstance]);

  // Handle new connections
  const onConnect = useCallback((params) => {
    const newEdge = { ...params, id: uuidv4() };
    setEdges((eds) => {
      const updatedEdges = addEdge(newEdge, eds);
      emitDiagramChange(nodes, updatedEdges);
      return updatedEdges;
    });
  }, [setEdges, emitDiagramChange, nodes]);

  // Add new node
  const addNode = useCallback((type = 'default', position = null) => {
    const defaultPosition = position || {
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100
    };

    const getNodeLabel = (nodeType) => {
      switch (nodeType) {
        case 'input': return 'Start';
        case 'output': return 'End';
        case 'rectangle': return 'Rectangle';
        case 'circle': return 'Circle';
        case 'diamond': return 'Decision';
        case 'text': return 'Text Note';
        case 'arrow': return 'Process';
        case 'database': return 'Database';
        default: return `${type.charAt(0).toUpperCase() + type.slice(1)} Node`;
      }
    };

    const newNode = {
      id: uuidv4(),
      type,
      position: defaultPosition,
      data: {
        label: getNodeLabel(type),
        backgroundColor: selectedColor,
        textColor: '#ffffff',
        onLabelChange: (newLabel) => {
          setNodes((nds) => 
            nds.map((node) => 
              node.id === newNode.id 
                ? { ...node, data: { ...node.data, label: newLabel } }
                : node
            )
          );
        }
      }
    };

    setNodes((nds) => {
      const updatedNodes = nds.concat(newNode);
      emitDiagramChange(updatedNodes, edges);
      return updatedNodes;
    });
  }, [setNodes, emitDiagramChange, edges, selectedColor]);

  // Clear diagram
  const clearDiagram = useCallback(() => {
    setNodes([]);
    setEdges([]);
    emitDiagramChange([], []);
  }, [setNodes, setEdges, emitDiagramChange]);

  // Apply template
  const applyTemplate = useCallback((templateData) => {
    setNodes(templateData.nodes);
    setEdges(templateData.edges);
    emitDiagramChange(templateData.nodes, templateData.edges);
    setShowTemplates(false);
  }, [setNodes, setEdges, emitDiagramChange]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      // Enter fullscreen
      const elem = document.querySelector('.diagram-container');
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`diagram-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="diagram-header">
        <h3>Collaborative Diagram</h3>
        <div className="diagram-status">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="tool-btn"
          >
            📋 Templates
          </button>
          <button 
            onClick={toggleFullscreen}
            className="tool-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '🔍' : '🖥️'} {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '●' : '○'} {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {showTemplates && (
        <DiagramTemplates onApplyTemplate={applyTemplate} />
      )}
      
      <div className="diagram-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
          
          <Panel position="top-left" className="diagram-tools">
            <div className="tool-group">
              <h4>Basic Shapes</h4>
              <button onClick={() => addNode('input')} className="tool-btn">
                📥 Start
              </button>
              <button onClick={() => addNode('rectangle')} className="tool-btn">
                ⬜ Rectangle
              </button>
              <button onClick={() => addNode('circle')} className="tool-btn">
                ⭕ Circle
              </button>
              <button onClick={() => addNode('diamond')} className="tool-btn">
                💎 Diamond
              </button>
              <button onClick={() => addNode('output')} className="tool-btn">
                📤 End
              </button>
            </div>
            <div className="tool-group">
              <h4>Special Shapes</h4>
              <button onClick={() => addNode('arrow')} className="tool-btn">
                ➡️ Process
              </button>
              <button onClick={() => addNode('database')} className="tool-btn">
                🗄️ Database
              </button>
              <button onClick={() => addNode('text')} className="tool-btn">
                📝 Text Note
              </button>
            </div>
            <div className="tool-group">
              <h4>Color</h4>
              <div className="color-picker">
                <input 
                  type="color" 
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="color-input"
                />
                <span>Node Color</span>
              </div>
            </div>
            <div className="tool-group">
              <button onClick={clearDiagram} className="tool-btn danger">
                🗑️ Clear All
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

function CollaborativeDiagram({ roomId, socket, isVisible }) {
  return (
    <ReactFlowProvider>
      <DiagramCanvas roomId={roomId} socket={socket} isVisible={isVisible} />
    </ReactFlowProvider>
  );
}

export default CollaborativeDiagram;