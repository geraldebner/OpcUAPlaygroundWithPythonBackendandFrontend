import React from 'react';
import binderLogo from '../binder_logo_2.png';
import BlockSelector from './shared/BlockSelector';

interface NavigationProps {
  selectedTab: 'parameters' | 'commandsandmeasurements' | 'status' | 'historical' | 'settings' | 'testrun';
  onTabChange: (tab: 'parameters' | 'commandsandmeasurements' | 'status' | 'historical' | 'settings' | 'testrun') => void;
  selectedBlock: number | null;
  blocks: Array<{ index: number }>;
  onBlockChange: (block: number | null) => void;
}

export default function Navigation({
  selectedTab,
  onTabChange,
  selectedBlock,
  blocks,
  onBlockChange
}: NavigationProps) {
  const tabs = [
    { id: 'parameters' as const, label: 'Parameters', icon: '📊' },
    { id: 'commandsandmeasurements' as const, label: 'Commands & Measurements', icon: '⚙️' },
    { id: 'testrun' as const, label: 'Test Run', icon: '📡' },
    { id: 'historical' as const, label: 'Historical Data', icon: '📈' },
    { id: 'status' as const, label: 'Status', icon: '🔍' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav style={{
      backgroundColor: '#1e3a5f',
      color: 'white',
      padding: '0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      marginBottom: '24px'
    }}>
      {/* Header with Logo and Title */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{
            width: '120px',
            height: '48px',
            backgroundColor: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <img 
              src={binderLogo} 
              alt="Binder Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>
          
          {/* Title and Subtitle */}
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}>
              VentilTester
            </h1>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 'normal'
            }}>
              OPC UA Valve Testing & Monitoring System
            </p>
          </div>
        </div>

        {/* Block Selector and Backend Check */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <BlockSelector
            selectedBlock={selectedBlock}
            onBlockChange={onBlockChange}
            style={{
              color: 'rgba(255,255,255,0.9)'
            }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        padding: '0 24px',
        gap: '4px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            disabled={selectedTab === tab.id}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedTab === tab.id ? '#3498db' : 'transparent',
              color: 'white',
              border: 'none',
              borderBottom: selectedTab === tab.id ? '3px solid #2980b9' : '3px solid transparent',
              cursor: selectedTab === tab.id ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: selectedTab === tab.id ? '600' : '500',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: selectedTab === tab.id ? 1 : 0.8,
              position: 'relative'
            }}
            onMouseEnter={e => {
              if (selectedTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={e => {
              if (selectedTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.8';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
