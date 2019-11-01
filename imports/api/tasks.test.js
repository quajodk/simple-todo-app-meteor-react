import {Meteor} from 'meteor/meteor';
import {Random} from 'meteor/random';
import {assert} from 'chai';
import {Accounts} from 'meteor/accounts-base';

import {Tasks} from './tasks.js';

if (Meteor.isServer) {
  describe('Tasks', () => {
    describe('methods', () => {
      const username = 'duke';
      let userId;
      let taskId;

      before(() => {
        let user = Meteor.users.findOne({username: username});
        if (!user) {
          userId = Accounts.createUser({
            username: username,
            email: 'u@me.com',
            password: '12345678'
          });
        } else {
          userId = user._id;
        }
      });

      beforeEach(() => {
        Tasks.remove({});
        taskId = Tasks.insert({
          task: 'test task',
          createdAt: new Date(),
          owner: userId,
          username: 'tmeasday'
        });
      });

      //   delete
      it('can delete owned task', () => {
        // Find the internal implementation of the task method so we can
        // test it in isolation
        const deleteTask = Meteor.server.method_handlers['tasks.remove'];

        // Set up a fake method invocation that looks like what the method expects
        const invocation = {userId};

        // Run the method with `this` set to the fake invocation
        deleteTask.apply(invocation, [taskId]);

        // Verify that the method does what we expected
        assert.equal(Tasks.find().count(), 0);
      });

      // insert
      it('can insert task', () => {
        let text = 'Hello!';
        const insertTask = Meteor.server.method_handlers['tasks.insert'];
        const invocation = {userId};
        insertTask.apply(invocation, [text]);
        assert.equal(Tasks.find().count(), 2);
      });

      // cannot insert if not logged
      it('cannot insert task if not logged in', () => {
        const text = 'Something!';
        const insertTask = Meteor.server.method_handlers['tasks.insert'];
        const invocation = {};
        // const actionInsert = () => insertTask.apply(invocation, [text]);

        assert.throws(
          () => insertTask.apply(invocation, [text]),
          Meteor.Error,
          '[not-authorized]'
        );
        assert.strictEqual(Tasks.find().count(), 1);
      });

      // check own task
      it('can set own task checked', () => {
        const setTask = Meteor.server.method_handlers['tasks.setChecked'];
        const invocation = {userId};
        setTask.apply(invocation, [taskId, true]);
        assert.strictEqual(Tasks.find({checked: true}).count(), 1);
      });

      // cannot set someone task checked
      it('cannot set someone else task checked', () => {
        // first set task private
        Tasks.update(taskId, {$set: {private: true}});
        const userId = Random.id();
        const setTask = Meteor.server.method_handlers['tasks.setChecked'];
        const invocation = {userId};
        assert.throws(
          () => setTask.apply(invocation, [taskId, true]),
          Meteor.Error,
          '[not-authorized]'
        );
        assert.strictEqual(Tasks.find({checked: true}).count(), 0);
      });

      // set own task private
      it('can set own task private', () => {
        const setPrivate = Meteor.server.method_handlers['tasks.setPrivate'];
        const invocation = {userId};
        setPrivate.apply(invocation, [taskId, true]);
        assert.strictEqual(Tasks.find({private: true}).count(), 1);
      });

      // cannot set someone else task private
      it('cannot set someone else task private', () => {
        const userId = Random.id();
        const setPrivate = Meteor.server.method_handlers['tasks.setPrivate'];
        const invocation = {userId};
        assert.throws(() => setPrivate.apply(invocation, [taskId, true]));
        assert.strictEqual(Tasks.find({private: true}).count(), 0);
      });

      // cannot delete someone task
      it('cannot delete someone else task', () => {
        const userId = Random.id();
        // set Task private
        Tasks.update(taskId, {$set: {private: true}});
        const deleteTask = Meteor.server.method_handlers['tasks.remove'];
        const invocation = userId;
        assert.throws(
          () => deleteTask.apply(invocation, [taskId]),
          Meteor.Error,
          '[not-authorized]'
        );
        assert.strictEqual(Tasks.find().count(), 1);
      });
    });
  });
}
