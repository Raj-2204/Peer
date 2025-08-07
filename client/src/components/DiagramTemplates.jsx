import React from 'react';
import { v4 as uuidv4 } from 'uuid';

const DiagramTemplates = ({ onApplyTemplate }) => {
  const templates = [
    {
      id: 'empty',
      name: 'Empty Canvas',
      description: 'Start with a blank diagram',
      icon: '⬜',
      data: {
        nodes: [],
        edges: []
      }
    },
    {
      id: 'basic-flowchart',
      name: 'Basic Flowchart',
      description: 'Simple process flow diagram',
      icon: '🔄',
      data: {
        nodes: [
          {
            id: 'node-1',
            type: 'input',
            position: { x: 250, y: 50 },
            data: { label: 'Start' }
          },
          {
            id: 'node-2',
            type: 'default',
            position: { x: 250, y: 150 },
            data: { label: 'Process Step' }
          },
          {
            id: 'node-3',
            type: 'default',
            position: { x: 250, y: 250 },
            data: { label: 'Decision?' }
          },
          {
            id: 'node-4',
            type: 'output',
            position: { x: 250, y: 350 },
            data: { label: 'End' }
          }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
          { id: 'edge-2', source: 'node-2', target: 'node-3' },
          { id: 'edge-3', source: 'node-3', target: 'node-4', label: 'Yes' }
        ]
      }
    },
    {
      id: 'er-diagram',
      name: 'ER Diagram',
      description: 'Database entity relationship diagram',
      icon: '🗃️',
      data: {
        nodes: [
          {
            id: 'user-node',
            type: 'default',
            position: { x: 100, y: 100 },
            data: { label: 'User\n- id (PK)\n- username\n- email' },
            style: { width: 120, height: 80 }
          },
          {
            id: 'post-node',
            type: 'default',
            position: { x: 350, y: 100 },
            data: { label: 'Post\n- id (PK)\n- title\n- content\n- user_id (FK)' },
            style: { width: 120, height: 100 }
          },
          {
            id: 'comment-node',
            type: 'default',
            position: { x: 225, y: 250 },
            data: { label: 'Comment\n- id (PK)\n- content\n- post_id (FK)\n- user_id (FK)' },
            style: { width: 140, height: 100 }
          }
        ],
        edges: [
          { id: 'user-post-edge', source: 'user-node', target: 'post-node', label: '1:N', type: 'smoothstep' },
          { id: 'post-comment-edge', source: 'post-node', target: 'comment-node', label: '1:N', type: 'smoothstep' },
          { id: 'user-comment-edge', source: 'user-node', target: 'comment-node', label: '1:N', type: 'smoothstep' }
        ]
      }
    },
    {
      id: 'user-story-map',
      name: 'User Story Map',
      description: 'User journey and story mapping',
      icon: '👤',
      data: {
        nodes: [
          {
            id: uuidv4(),
            type: 'input',
            position: { x: 50, y: 50 },
            data: { label: 'Epic: User Management' },
            style: { backgroundColor: '#28a745', width: 200 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 50, y: 150 },
            data: { label: 'User Registration\n• Sign up with email\n• Verify account\n• Create profile' },
            style: { width: 180, height: 80 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 280, y: 150 },
            data: { label: 'User Login\n• Email/password\n• Remember me\n• Forgot password' },
            style: { width: 180, height: 80 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 50, y: 280 },
            data: { label: 'Profile Management\n• Edit profile\n• Upload avatar\n• Privacy settings' },
            style: { width: 180, height: 80 }
          }
        ],
        edges: [
          { id: uuidv4(), source: '1', target: '2' },
          { id: uuidv4(), source: '1', target: '3' },
          { id: uuidv4(), source: '2', target: '4' }
        ]
      }
    },
    {
      id: 'system-architecture',
      name: 'System Architecture',
      description: 'High-level system components',
      icon: '🏗️',
      data: {
        nodes: [
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 100, y: 50 },
            data: { label: 'Frontend\n(React)' },
            style: { backgroundColor: '#007acc', width: 100 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 300, y: 50 },
            data: { label: 'API Gateway' },
            style: { backgroundColor: '#ffc107', color: '#000', width: 100 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 500, y: 50 },
            data: { label: 'Backend\n(Node.js)' },
            style: { backgroundColor: '#28a745', width: 100 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 300, y: 200 },
            data: { label: 'Database\n(PostgreSQL)' },
            style: { backgroundColor: '#6c757d', width: 120 }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 500, y: 200 },
            data: { label: 'File Storage\n(S3)' },
            style: { backgroundColor: '#dc3545', width: 100 }
          }
        ],
        edges: [
          { id: uuidv4(), source: '1', target: '2', label: 'HTTPS' },
          { id: uuidv4(), source: '2', target: '3', label: 'REST API' },
          { id: uuidv4(), source: '3', target: '4', label: 'SQL' },
          { id: uuidv4(), source: '3', target: '5', label: 'API' }
        ]
      }
    },
    {
      id: 'agile-workflow',
      name: 'Agile Workflow',
      description: 'Sprint planning and workflow',
      icon: '🏃',
      data: {
        nodes: [
          {
            id: uuidv4(),
            type: 'input',
            position: { x: 50, y: 100 },
            data: { label: 'Backlog' }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 200, y: 100 },
            data: { label: 'Sprint Planning' }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 350, y: 100 },
            data: { label: 'In Progress' }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 500, y: 100 },
            data: { label: 'Code Review' }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 650, y: 100 },
            data: { label: 'Testing' }
          },
          {
            id: uuidv4(),
            type: 'output',
            position: { x: 800, y: 100 },
            data: { label: 'Done' }
          },
          {
            id: uuidv4(),
            type: 'default',
            position: { x: 425, y: 250 },
            data: { label: 'Sprint Review\n& Retrospective' }
          }
        ],
        edges: [
          { id: uuidv4(), source: '1', target: '2' },
          { id: uuidv4(), source: '2', target: '3' },
          { id: uuidv4(), source: '3', target: '4' },
          { id: uuidv4(), source: '4', target: '5' },
          { id: uuidv4(), source: '5', target: '6' },
          { id: uuidv4(), source: '6', target: '7' },
          { id: uuidv4(), source: '7', target: '1', type: 'smoothstep', animated: true }
        ]
      }
    }
  ];

  const handleTemplateClick = (template) => {
    // Create a mapping of old IDs to new IDs
    const idMapping = {};
    
    // Create new nodes with new IDs
    const newNodes = template.data.nodes.map(node => {
      const newId = uuidv4();
      idMapping[node.id] = newId;
      return {
        ...node,
        id: newId
      };
    });

    // Create new edges using the ID mapping
    const newEdges = template.data.edges.map(edge => ({
      ...edge,
      id: uuidv4(),
      source: idMapping[edge.source] || edge.source,
      target: idMapping[edge.target] || edge.target
    }));

    onApplyTemplate({ nodes: newNodes, edges: newEdges });
  };

  return (
    <div className="diagram-templates">
      <h4>Templates</h4>
      <div className="template-grid">
        {templates.map(template => (
          <button
            key={template.id}
            className="template-card"
            onClick={() => handleTemplateClick(template)}
            title={template.description}
          >
            <div className="template-icon">{template.icon}</div>
            <div className="template-name">{template.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DiagramTemplates;