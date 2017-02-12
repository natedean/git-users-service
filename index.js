const app = require('express')();
const cors = require('cors');
const db = require('./db');

app.use(cors());

app.get('/users', (req, res) => {
  const limit = 5;
  const page = req.query.page || 1;
  const pageOffset = page <= 1 ? 0 : page * limit;

  db.getUsers(pageOffset, limit)
    .then(users => res.send(users))
    .catch(() => res.send('There has been an error connecting to the database'));
});

app.get('/user/:id', (req, res) => {
  if (!req.params.id) return res.send('No results. You must include a userId.');

  // TODO: add getUserById implementation
});

app.listen(3001, () => {
  console.log('Server listening on PORT 3000')
});
