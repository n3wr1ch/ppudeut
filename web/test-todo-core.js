import assert from 'assert';
import { addTodoList, toggleTodoById, deleteTodoById, moveTodoById } from './todo-core.js';

function runTests() {
  let todos = [];
  todos = addTodoList(todos, 'Task 1');
  assert.strictEqual(todos.length, 1);
  todos = addTodoList(todos, 'Task 2');
  assert.strictEqual(todos[0].text, 'Task 2');

  const id = todos[0].id;
  todos = toggleTodoById(todos, id);
  assert.strictEqual(todos[0].completed, true);
  todos = toggleTodoById(todos, id);
  assert.strictEqual(todos[0].completed, false);

  const id2 = todos[1].id;
  todos = moveTodoById(todos, id2, 'up');
  assert.strictEqual(todos[0].id, id2);

  todos = deleteTodoById(todos, id);
  assert.strictEqual(todos.find(t => t.id === id), undefined);

  console.log('All tests passed');
}

runTests();