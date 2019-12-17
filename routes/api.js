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
                $project: {"replies.delete_password": 0, "replies.reported": 0},
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
    })
    .delete(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const required_fields = ['thread_id', 'delete_password'];
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
        let thread_id = req.body.thread_id;
        try {
            let r = await col.findOne({ _id: new ObjectId(thread_id) });
            if (r === null) {  // no such thread
                return res.status(422).send('no such thread');
            }
            let match = await bcrypt.compare(req.body.delete_password, r.delete_password);
            if (match){
                r = await col.deleteOne({ _id: new ObjectId(thread_id) });
                if (r.result.ok == 1 && r.deletedCount == 1) {
                    return res.send('success');
                }
                return res.status(200).send("thread already deleted");
            } else {
                return res.status(422).send('incorrect password');
            }
        } catch (e) {
            return res.status(500).send('Database error');
        }
    })
    .put(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const required_fields = ['thread_id'];

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

        let thread_id = req.body.thread_id;

        try {
            let r = await col.updateOne({
                _id: new ObjectId(thread_id)
            },
            {
                $set : { reported: true },
            });
            if (r.result.ok && r.matchedCount == 1 && r.modifiedCount == 1) {
                return res.send('success');
            } else if (!r.matchedCount) {
                return res.status(422).send('no such thread');
            }
            return res.status(200).send("thread already reported");
        } catch (e) {
            return res.status(500).send('Database error');
        }
    });

  app.route('/api/replies/:board')
    .get(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const thread_id = req.query.thread_id;
        if (!thread_id) {
            return res.status(422).send('missing `thread_id` query param');
        }
        let r = await col.findOne({
            _id: new ObjectId(thread_id),
        },
        {
            projection: {
                delete_password: 0,
                reported: 0,
                "replies.delete_password": 0,
                "replies.reported": 0
            }
        });
        // Note: what to do when no threads found? Not stated in specs.
        return res.json(r);
    })
    .post(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const required_fields = ['text', 'delete_password', 'thread_id'];

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

        let r = await col.updateOne({
            _id: new ObjectId(req.body.thread_id),
        },
        {
            $set: { bumped_on: now },
            $push: {
               replies: {
                   _id: new ObjectId(),
                   text: req.body.text,
                   delete_password: hashed,
                   created_on: now,
                   reported: false,
               }
            }
        });

        if (r.result.ok && r.matchedCount == 1 && r.modifiedCount == 1) {
            return res.redirect(`/b/${board}/${req.body.thread_id}`);
        }
        return res.status(500).send('Database error.');
    })
    .put(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const required_fields = ['thread_id', 'reply_id'];
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

        const [ thread_id, reply_id ] = [ req.body.thread_id, req.body.reply_id ];

        try {
            let r = await col.updateOne({
                _id: new ObjectId(thread_id),
                "replies._id": new ObjectId(reply_id),
            },
            {
                $set: {"replies.$.reported": true },
            });
            if (r.matchedCount == 1, r.modifiedCount == 1) {
                return res.send('success');
            } else if (!r.matchedCount) {
                return res.status(422).send('no such reply');
            }
            return res.status(200).send("reply already has been reported");
        } catch (e) {
            return res.status(500).send('Database error');
        }

    })
    .delete(async (req, res) => {
        const board = req.params.board;
        const col = client.db().collection(board);
        const required_fields = ['delete_password', 'thread_id', 'reply_id'];

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

        const [ thread_id, reply_id ] = [ req.body.thread_id, req.body.reply_id ];

        try {
            let r = await col.findOne({
                _id: new ObjectId(thread_id),
                "replies._id": new ObjectId(reply_id),
            });
            if (r === null) {  // no such thread
                return res.status(422).send('no such reply');
            }
            let reply = r.replies.filter((val) => {
                return val._id == reply_id;
            })[0];
            let match = await bcrypt.compare(req.body.delete_password, reply.delete_password);
            if (match){
                r = await col.updateOne({
                    _id: new ObjectId(thread_id),
                    "replies._id": new ObjectId(reply_id),
                },
                {
                    $set: {"replies.$.text": "[deleted]"},
                });
                if (r.matchedCount == 1, r.modifiedCount == 1) {
                    return res.send('success');
                }
                return res.status(200).send("reply already deleted");
            } else {
                return res.status(422).send('incorrect password');
            }
        } catch (e) {
            return res.status(500).send('Database error');
        }
    });
};
