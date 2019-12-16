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
                  assert.property(res.body[0], '_id');
                  assert.property(res.body[0], 'text');
                  assert.property(res.body[0], 'created_on');
                  assert.property(res.body[0], 'bumped_on');
                  assert.property(res.body[0], 'replies');
                  assert.property(res.body[0], 'replycount');
                  assert.notProperty(res.body[0], 'reported')
                  assert.notProperty(res.body[0], 'delete_password')
                  assert.propertyVal(res.body[0], 'text', thread_message, 'thread message should be same as input earlier')
                  assert.isAtMost(res.body.length, 10, 'threads are at most 10');
                  assert.isAtMost(res.body[0].replies.length, 3, 'replies is at most 3');
                  done();
              });
        })

    });

    suite('DELETE', function() {

    });

    suite('PUT', function() {

    });


  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    suite('POST', function() {

    });

    suite('GET', function() {

    });

    suite('PUT', function() {

    });

    suite('DELETE', function() {

    });

  });

});
