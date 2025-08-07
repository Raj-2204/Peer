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

const nodeTypes = {
  // Custom node types can be added here in the future
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
    if (!reactFlowInstance) return;

    const defaultPosition = position || {
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100
    };

    const newNode = {
      id: uuidv4(),
      type,
      position: defaultPosition,
      data: {
        label: type === 'input' ? 'Start' : 
               type === 'output' ? 'End' : 
               `${type.charAt(0).toUpperCase() + type.slice(1)} Node`
      }
    };

    setNodes((nds) => {
      const updatedNodes = nds.concat(newNode);
      emitDiagramChange(updatedNodes, edges);
      return updatedNodes;
    });
  }, [reactFlowInstance, setNodes, emitDiagramChange, edges]);

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

  if (!isVisible) {
    return null;
  }

  return (
    <div className="diagram-container">
      <div className="diagram-header">
        <h3>Collaborative Diagram</h3>
        <div className="diagram-status">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="tool-btn"
          >
            📋 Templates
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
              <button onClick={() => addNode('input')} className="tool-btn">
                📥 Start
              </button>
              <button onClick={() => addNode('default')} className="tool-btn">
                ⬜ Process
              </button>
              <button onClick={() => addNode('output')} className="tool-btn">
                📤 End
              </button>
            </div>
            <div className="tool-group">
              <button onClick={clearDiagram} className="tool-btn danger">
                🗑️ Clear
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