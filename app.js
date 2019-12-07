const fs = require('fs');
const express = require('express')
const path = require('path');
const cors = require('cors')
const app = express()
app.use(cors());
const port = 3000

app.get('/', function (req, res) {
  var files = fs.readdirSync(path.join(__dirname, 'public', 'files'));
  res.sendFile(path.join(__dirname, 'public', 'files', files[0]));
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
