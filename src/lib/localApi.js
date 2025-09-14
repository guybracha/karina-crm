const KEY = 'crm:customers';

const read = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

export async function listCustomers() {
  return read().sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
}
export async function getCustomer(id) {
  return read().find(x => x.id === id) || null;
}
export async function createCustomer(data) {
  const id = crypto.randomUUID();
  const now = Date.now();
  write([...read(), { id, createdAt: now, updatedAt: now, ...data }]);
  return { id };
}
export async function updateCustomer(id, patch) {
  const arr = read().map(x => x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x);
  write(arr);
}
export async function removeCustomer(id) {
  write(read().filter(x => x.id !== id));
}
