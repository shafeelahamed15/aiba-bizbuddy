import React from 'react';

const SuggestionBox = ({ 
  suggestions = [], 
  isVisible = false, 
  onSuggestionClick, 
  currentField = '', 
  inputValue = '' 
}) => {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const suggestionBoxStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #e1e5e9',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '4px'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderBottom: '1px solid #e1e5e9',
    fontSize: '12px',
    fontWeight: 500
  };

  const countStyle = {
    background: '#6c757d',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px'
  };

  const itemStyle = {
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f3f4',
    transition: 'background-color 0.2s ease'
  };

  const getBadgeStyle = (type) => {
    const baseStyle = {
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '10px',
      fontWeight: 500,
      marginLeft: '8px'
    };

    switch (type) {
      case 'recent_customer':
        return { ...baseStyle, background: '#e3f2fd', color: '#1976d2' };
      case 'popular_product':
        return { ...baseStyle, background: '#f3e5f5', color: '#7b1fa2' };
      case 'historical_rate':
        return { ...baseStyle, background: '#e8f5e8', color: '#388e3c' };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={suggestionBoxStyle}>
      <div style={headerStyle}>
        <span style={{ color: '#495057' }}>
          💡 {currentField === 'customerName' ? 'Customer suggestions' : 
             currentField === 'productDescription' ? 'Product suggestions' :
             'Suggestions'}
        </span>
        <span style={countStyle}>{suggestions.length}</span>
      </div>
      
      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        {suggestions.slice(0, 8).map((suggestion, index) => (
          <div
            key={index}
            style={itemStyle}
            onClick={() => onSuggestionClick(suggestion)}
            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#212529', flex: 1 }}>
                {suggestion.text}
              </span>
              {suggestion.type === 'recent_customer' && (
                <span style={getBadgeStyle('recent_customer')}>Recent</span>
              )}
              {suggestion.type === 'popular_product' && (
                <span style={getBadgeStyle('popular_product')}>Popular</span>
              )}
              {suggestion.type === 'historical_rate' && (
                <span style={getBadgeStyle('historical_rate')}>Historical</span>
              )}
            </div>
            
            {suggestion.metadata && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                {suggestion.metadata.description && (
                  <span style={{ fontSize: '11px', color: '#6c757d', flex: 1 }}>
                    {suggestion.metadata.description}
                  </span>
                )}
                {suggestion.metadata.lastQuoteDate && (
                  <span style={{ fontSize: '10px', color: '#9e9e9e' }}>
                    Last: {suggestion.metadata.lastQuoteDate}
                  </span>
                )}
                {suggestion.metadata.typicalRate && (
                  <span style={{ fontSize: '11px', color: '#388e3c', fontWeight: 500 }}>
                    ~₹{suggestion.metadata.typicalRate}
                  </span>
                )}
                {suggestion.metadata.commonUOM && (
                  <span style={{ 
                    fontSize: '10px', 
                    background: '#e9ecef', 
                    color: '#495057', 
                    padding: '1px 4px', 
                    borderRadius: '3px' 
                  }}>
                    {suggestion.metadata.commonUOM}
                  </span>
                )}
              </div>
            )}
            
            <div style={{ height: '2px', background: '#e9ecef', borderRadius: '1px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: suggestion.type === 'recent_customer' ? '#1976d2' :
                             suggestion.type === 'popular_product' ? '#7b1fa2' :
                             suggestion.type === 'historical_rate' ? '#388e3c' :
                             'linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%)',
                  transition: 'width 0.3s ease',
                  width: `${suggestion.confidence * 100}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
      

    </div>
  );
};

export default SuggestionBox; 