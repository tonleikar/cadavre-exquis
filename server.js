const express = require('express');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index', { title: 'My Express App', main: 'This is the main content', other: 'This is some other content' });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
