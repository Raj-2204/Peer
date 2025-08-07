import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

// Custom Rectangle Node
export const RectangleNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Rectangle');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node rectangle-node"
      style={{
        background: data.backgroundColor || '#007acc',
        border: `2px solid ${selected ? '#4fc3f7' : '#444'}`,
        borderRadius: '8px',
        padding: '12px 16px',
        color: data.textColor || '#ffffff',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            textAlign: 'center',
            width: '100%',
            outline: 'none'
          }}
        />
      ) : (
        <div>{label}</div>
      )}

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Circle Node
export const CircleNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Circle');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node circle-node"
      style={{
        background: data.backgroundColor || '#28a745',
        border: `2px solid ${selected ? '#4fc3f7' : '#444'}`,
        borderRadius: '50%',
        width: '100px',
        height: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: data.textColor || '#ffffff',
        cursor: 'pointer',
        fontSize: '14px'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            textAlign: 'center',
            width: '80px',
            outline: 'none',
            fontSize: '12px'
          }}
        />
      ) : (
        <div style={{ wordBreak: 'break-word', padding: '4px' }}>{label}</div>
      )}

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Diamond Node
export const DiamondNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Decision');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node diamond-node"
      style={{
        background: data.backgroundColor || '#ffc107',
        border: `2px solid ${selected ? '#4fc3f7' : '#444'}`,
        width: '100px',
        height: '100px',
        transform: 'rotate(45deg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: data.textColor || '#000000',
        cursor: 'pointer',
        position: 'relative'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={{ transform: 'rotate(-45deg)' }} />
      <Handle type="target" position={Position.Left} style={{ transform: 'rotate(-45deg)' }} />
      
      <div style={{ transform: 'rotate(-45deg)', textAlign: 'center', fontSize: '12px' }}>
        {isEditing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleBlur}
            autoFocus
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              textAlign: 'center',
              width: '80px',
              outline: 'none',
              fontSize: '11px'
            }}
          />
        ) : (
          <div style={{ wordBreak: 'break-word', padding: '4px' }}>{label}</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Bottom} style={{ transform: 'rotate(-45deg)' }} />
    </div>
  );
};

// Custom Text Node
export const TextNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Text Note');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node text-node"
      style={{
        background: data.backgroundColor || 'transparent',
        border: `1px dashed ${selected ? '#4fc3f7' : '#666'}`,
        borderRadius: '4px',
        padding: '8px 12px',
        color: data.textColor || '#ffffff',
        minWidth: '100px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            resize: 'none',
            width: '100%',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit'
          }}
          rows={3}
        />
      ) : (
        <div style={{ whiteSpace: 'pre-wrap' }}>{label}</div>
      )}
    </div>
  );
};

// Custom Arrow Node (for flowcharts)
export const ArrowNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Process');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node arrow-node"
      style={{
        background: data.backgroundColor || '#6f42c1',
        border: `2px solid ${selected ? '#4fc3f7' : '#444'}`,
        borderRadius: '4px 20px 4px 20px',
        padding: '12px 20px',
        color: data.textColor || '#ffffff',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} />
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            textAlign: 'center',
            width: '100%',
            outline: 'none'
          }}
        />
      ) : (
        <div>{label}</div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};

// Custom Database Node
export const DatabaseNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || 'Database');

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(label);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  };

  return (
    <div
      className="custom-node database-node"
      style={{
        background: data.backgroundColor || '#20c997',
        border: `2px solid ${selected ? '#4fc3f7' : '#444'}`,
        borderRadius: '20px',
        padding: '16px 20px',
        color: data.textColor || '#ffffff',
        minWidth: '120px',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      
      <div style={{ marginBottom: '8px', fontSize: '18px' }}>🗄️</div>
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleBlur}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            textAlign: 'center',
            width: '100%',
            outline: 'none'
          }}
        />
      ) : (
        <div>{label}</div>
      )}

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};