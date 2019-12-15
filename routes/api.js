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
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function (app, client) {

  app.route('/api/threads/:board')
    .get(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        try {
            let r = await col.aggregate([{
                $addFields: {
                    replies: {
                        $ifNull: [ "$replies", []],
                    },
                },
            },
            {
                $sort: {
                    created_on: -1,
                    "replies.created_on": -1
                },
            },
            {
                $limit : 10,
            },
            {
                $project: {
                    text: 1,
                    created_on: 1,
                    bumped_on: 1,
                    replies: {
                        $slice: [ "$replies", -3 ],
                    },
                    replycount: { $size: "$replies" },  // required by frontend
                }
            },
            {
                $unset: ["replies.delete_password", "replies.reported"],
            }]).toArray();
            res.json(r)
        } catch (e) {
            res.status(500).send(e.message);
        }
    })
    .post(async (req, res) => {
        const board = req.params.board;
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
        let hashed = await bcrypt.hash(req.body.delete_password, saltRounds);
        let r = await col.insertOne({
            text: req.body.text,
            delete_password: hashed,
            created_on: now,
            bumped_on: now,
            reported: false,
        });
        if (r.insertedCount == 1) {
            return res.redirect(`/b/${board}/`);
        }
        return res.status(500).send('Database error.');
    });

  app.route('/api/replies/:board');

};
