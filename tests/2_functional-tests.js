/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var server = require('../server');

chai.use(chaiHttp);

const random_val = Math.floor(Math.random() * 100000);
const board_name = `test-board-${random_val}`,
    thread_message = `test thread message ${random_val}`,
    reply_message = `reply message ${random_val}`,
    delete_password = `deleteMe${random_val}`;
let thread_id, thread_id_for_delete, reply_id;


suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {

    suite('POST', function() {
        test('Test POST redirects to board page', (done) =>{
          chai.request(server)
            .post(`/api/threads/${board_name}`)
            .send({
                text: thread_message,
                delete_password: delete_password,
            })
            .end(function(err, res){
                if (err) {
                    return  assert.fail("some error happened");
                }
                expect(res).to.redirectTo(RegExp(String.raw`/b/${board_name}/$`));
                assert.equal(res.status, 200);
                done();
            });
        })
    });

    suite('GET', function() {
        test('Test GET retrieves board with 10 threads and max 3 recent replies', (done) =>{
            chai.request(server)
              .get(`/api/threads/${board_name}`)
              .send()
              .end(function(err, res){
                  if (err) {
                      return  assert.fail("some error happened");
                  }
                  assert.equal(res.status, 200);
                  assert.isArray(res.body);
                  assert.isAtMost(res.body.length, 10, 'threads are at most 10');
                  assert.property(res.body[0], '_id');
                  assert.property(res.body[0], 'text');
                  assert.property(res.body[0], 'created_on');
                  assert.property(res.body[0], 'bumped_on');
                  assert.property(res.body[0], 'replies');
                  assert.property(res.body[0], 'replycount');
                  assert.notProperty(res.body[0], 'reported')
                  assert.notProperty(res.body[0], 'delete_password')
                  assert.propertyVal(res.body[0], 'text', thread_message, 'thread message should be same as input earlier')
                  assert.isAtMost(res.body[0].replies.length, 3, 'replies is at most 3');
                  thread_id = res.body[0]._id;
                  done();
              });
        })

    });

    suite('DELETE', function() {

        suiteSetup('setup test thread for DELETE', (done) =>{
            chai.request(server)
                .post(`/api/threads/${board_name}`)
                .send({
                    text: thread_message,
                    delete_password: delete_password,
                })
                .end((err, res) => {
                    chai.request(server)
                        .get(`/api/threads/${board_name}`)
                        .send()
                        .end((err, res) => {
                            assert.property(res.body[0], '_id');
                            thread_id_for_delete = res.body[0]._id;
                            done();
                        });
                });
        });

        test('Test DELETE with wrong password', (done) =>{
            chai.request(server)
                .delete(`/api/threads/${board_name}`)
                .send({
                        thread_id: thread_id_for_delete,
                        delete_password: 'wrong_password',
                })
                .end((err, res) => {
                    assert.equal(res.status, 422);
                    assert.equal(res.text, 'incorrect password');
                    done();
                });
        });

        test('Test DELETE with correct password', (done) =>{
            chai.request(server)
              .delete(`/api/threads/${board_name}`)
              .send({
                    thread_id: thread_id_for_delete,
                    delete_password: delete_password,
              })
              .end(function(err, res){
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success');
                  done();
              });
        });

    });

    suite('PUT', function() {
        test('Test PUT to report thread', (done) =>{
            chai.request(server)
              .put(`/api/threads/${board_name}`)
              .send({
                    thread_id: thread_id,
              })
              .end(function(err, res){
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success');
                  done();
              });
        });

    });


  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    suite('POST', function() {
        test('Test POST reply redirects to board page', (done) =>{
          chai.request(server)
            .post(`/api/replies/${board_name}`)
            .send({
                thread_id: thread_id,
                text: reply_message,
                delete_password: delete_password,
            })
            .end(function(err, res){
                if (err) {
                    return  assert.fail("some error happened");
                }
                expect(res).to.redirectTo(RegExp(String.raw`/b/${board_name}/${thread_id}$`));
                assert.equal(res.status, 200);
                done();
            });
        })

    });

    suite('GET', function() {
        test('Test GET a thread and its replies', (done) =>{
            chai.request(server)
              .get(`/api/replies/${board_name}`)
              .query({
                  thread_id: thread_id,
              })
              .end(function(err, res){
                  if (err) {
                      return  assert.fail("some error happened");
                  }
                  assert.equal(res.status, 200);
                  assert.property(res.body, '_id');
                  assert.property(res.body, 'text');
                  assert.property(res.body, 'created_on');
                  assert.property(res.body, 'bumped_on');
                  assert.property(res.body, 'replies');
                  assert.notProperty(res.body, 'reported');
                  assert.notProperty(res.body, 'delete_password');
                  assert.propertyVal(res.body, 'text', thread_message, 'thread message should be same as input earlier');
                  assert.isAtLeast(res.body.replies.length, 1, 'replies is least 1');
                  assert.property(res.body.replies.slice(-1)[0], '_id');
                  assert.property(res.body.replies.slice(-1)[0], 'text');
                  assert.property(res.body.replies.slice(-1)[0], 'created_on');
                  assert.notProperty(res.body.replies.slice(-1)[0], 'reported');
                  assert.notProperty(res.body.replies.slice(-1)[0], 'delete_password');
                  assert.propertyVal(res.body.replies.slice(-1)[0], 'text', reply_message, 'reply message should be same as input earlier');
                  reply_id = res.body.replies.slice(-1)[0]._id;
                  done();
              });
        });
    });

    suite('PUT', function() {
        test('Test PUT to report replies', (done) =>{
            chai.request(server)
              .put(`/api/replies/${board_name}`)
              .send({
                  thread_id: thread_id,
                  reply_id: reply_id,
              })
              .end(function(err, res){
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success');
                  done();
              });
        });
    });

    suite('DELETE', function() {
        test('Test DELETE a reply from a thread with wrong password', (done) =>{
            chai.request(server)
              .delete(`/api/replies/${board_name}`)
              .send({
                  thread_id: thread_id,
                  reply_id: reply_id,
                  delete_password: "wrong password",
              })
              .end(function(err, res){
                  assert.equal(res.status, 422);
                  assert.equal(res.text, 'incorrect password');
                  done();
              });
        });

        test('Test DELETE a reply from a thread with correct password', (done) =>{
            chai.request(server)
              .delete(`/api/replies/${board_name}`)
              .send({
                  thread_id: thread_id,
                  reply_id: reply_id,
                  delete_password: delete_password,
              })
              .end(function(err, res){
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success');

                  // check actual reply
                  chai.request(server)
                    .get(`/api/replies/${board_name}`)
                    .query({
                        thread_id: thread_id,
                    })
                    .end(function(err, res){
                        assert.propertyVal(res.body.replies.slice(-1)[0], 'text', "[deleted]", 'reply message should become "[deleted]"');
                        done();
                    });
              });
        });
    });

  });

  suiteTeardown('Teardown for created test threads', (done) =>{
    chai.request(server)
      .delete(`/api/threads/${board_name}`)
      .send({
            thread_id: thread_id,
            delete_password: delete_password,
      })
      .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
      });
  });

});
