const {program} = require('commander');
const path = require('path');
const fs = require('fs');
const fsPromise = require('fs/promises');
const express = require('express');
const multer = require('multer');

const app = express()

program
    .requiredOption('-h, --host <ip>', 'ip address of the server')
    .requiredOption('-p, --port <port>', 'port of the server')
    .requiredOption('-c, --cache <path>', 'path to cache files');

program.parse(process.argv);

const opts = program.opts();
const cachePath = opts.cache;

fsPromise.access(cachePath)
    .catch(() => fsPromise.mkdir(cachePath))
    
app.use(express.text());

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage }).fields([
    { name: 'note_name', maxCount: 1 },
    { name: 'note', maxCount: 1 }
]);

app.get('/notes/:noteName', (req, res) => {
    fs.open(`${cachePath}/${req.params.noteName}`, (err) => {
        res.status(404).send('Not found');
    });

    fs.readFile(`${cachePath}/${req.params.noteName}`, (err, data) => {
        if(err) return res.status(404).send('Not found');
        res.status(200).send(data);
    })
})

app.put('/notes/:noteName', (req, res) => {
    fs.open(`${cachePath}/${req.params.noteName}`, (err, fd) => {
        if(err) return res.status(404).send('Not found');
        fs.write(fd, req.body);
        res.status(200).send();
    });
});

app.delete('/notes/:noteName', (req, res) => {
    const filePath = `${cachePath}/${req.params.noteName}`;

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Not found'); 
        }

        fs.rm(filePath, (err) => {

            res.status(200).send('File deleted successfully'); 
        });
    });
});

app.get('/notes', (req, res) => {
    fs.readdir(cachePath, (err, files) => {

        const filePromises = files.map(file => {
            const filePath = path.join(cachePath, file);

            return new Promise((resolve, reject) => {
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        reject(err); 
                    } else {
                        resolve({ name: file, text: data }); 
                    }
                });
            });
        });

        Promise.all(filePromises)
            .then(fileObjects => {
                res.status(200).json(fileObjects);
            });
    });
});

app.post('/write', upload, (req, res) => {
    const noteName = req.body.note_name; 
    const noteContent = req.body.note;   

    const filePath = path.join(cachePath, noteName); 

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            return res.status(400).send('Note with this name already exists');
        }

        fs.writeFile(filePath, noteContent, 'utf8', (err) => {
            res.status(201).send('Note created successfully');
        });
    });
});

app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

app.listen(opts.port, opts.host, () => console.log(`server listening at ${opts.host}:${opts.port}`));
