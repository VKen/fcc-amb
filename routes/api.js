/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var ObjectId = require('mongodb').ObjectID;

module.exports = function (app, client) {

  app.route('/api/threads/:board')
    .post(async (req, res) => {
        const board = req.params.board
        const col = client.db().collection(board);
        const required_fields = ['text', 'delete_password'];
        let missing = [];
        if (!required_fields.every((ele, idx) => {
            if (req.body[ele] === undefined) {
                missing.push(ele);
                return false;
            }
            return true
        })) {
            return res.status(422).send(`missing required fields ${JSON.stringify(missing)}`);
        }

        let now = new Date();
        let r = await col.insertOne({
            text: req.body.text,
            delete_password: req.body.delete_password,  // TODO: hash?
            created_on: now,
            bumped_on: now,
            reported: false,
        });
        if (r.insertedCount == 1) {
            return res.redirect(`/b/${board}`);
        }
        return res.status(500).send('Database error.');

    });

  app.route('/api/replies/:board');

};
