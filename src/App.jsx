import React from 'react';

function App() {
  const data = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

export default App;