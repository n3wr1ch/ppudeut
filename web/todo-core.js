export function addTodoList(todos, text) {
  const t = (text || '').trim();
  if (!t) return todos.slice();
  if (t.length > 200) return todos.slice();
  const todo = { id: Date.now(), text: t, completed: false, createdAt: new Date().toISOString() };
  return [todo, ...todos];
}

export function toggleTodoById(todos, id) {
  return todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
}

export function deleteTodoById(todos, id) {
  return todos.filter(t => t.id !== id);
}

export function moveTodoById(todos, id, direction) {
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return todos.slice();
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= todos.length) return todos.slice();
  const copy = todos.slice();
  const [item] = copy.splice(idx, 1);
  copy.splice(newIdx, 0, item);
  return copy;
}