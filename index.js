const app = require('express')();
const cors = require('cors');
const db = require('./db');

app.use(cors());

app.get('/users', (req, res) => {
  const limit = 20;
  const page = req.query.page || 1;
  const pageOffset = page <= 1 ? 0 : page * limit;
  const sortDirection = req.query.sortDirection || 'desc';
  const sortCode = sortDirection === 'desc' ? -1 : 1;
  const sortField = req.query.sortField || '_create_at';

  db.getUsers(pageOffset, limit, sortField, sortCode)
    .then(users => res.send(users))
    .catch(() => res.send('There has been an error connecting to the database'));
});

app.get('/user/:id', (req, res) => {
  if (!req.params.id) return res.send('No results. You must include a userId.');

  // TODO: add getUserById implementation
});

app.post('/user/update/:username', (req, res) => {
  const username = req.params.username;
  if (!username) return res.send('Must send a username!');

  db.updateUser(username)
    .then(user => res.send(user))
    .catch(() => res.send('There has been an error updating the user'));
});

app.listen(3001, () => {
  console.log('Server listening on PORT 3001')
});
