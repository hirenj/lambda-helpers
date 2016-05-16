var AWS = require('./aws-promise');

var get_rule_state = function(event) {
  var cloudevents = new AWS.CloudWatchEvents();
  var new_rule = false;
  var rule_enabled = false;

  return cloudevents.listRules({NamePrefix:event}).promise().then(function(result) {
    if (result.data.Rules.length == 0) {
      new_rule = true;
    }
    result.data.Rules.forEach(function(rule) {
      rule_enabled = rule_enabled || (rule.State !== 'DISABLED');
    });
  }).then(function() {
  	return {'new_rule' : new_rule, 'rule_enabled' : rule_enabled };
  });
};

exports.subscribe = function subscribe(event,arn,data) {
  var cloudevents = new AWS.CloudWatchEvents();
  var id = arn.split(':').reverse()[0];
  return cloudevents.putTargets({
    Rule:event,
    Targets:[
      { Arn: arn, Id: id, Input: JSON.stringify(data) }
    ]
  }).promise();
};

exports.setInterval = function setInterval(event,rate) {
  var cloudevents = new AWS.CloudWatchEvents();
  return get_rule_state(event).then(function(state) {
    return cloudevents.putRule({
      Name:event,
      ScheduleExpression: 'rate('+rate+')',
      State: state.rule_enabled ? 'ENABLED' : 'DISABLED'
    }).promise().then(function() {
      return state.new_rule;
    });
  });
};

exports.setTimeout = function setTimeout(event,date) {
  var cloudevents = new AWS.CloudWatchEvents();
  var cron_string = [ date.getUTCMinutes(),
                      date.getUTCHours(),
                      date.getUTCDate(),
                      date.getUTCMonth()+1,
                      '?',
                      date.getUTCFullYear()
                    ].join(' ');
  console.log(date.toString(),cron_string);
  return get_rule_state(event).then(function(state) {
    return cloudevents.putRule({
      Name:event,
      ScheduleExpression: 'cron('+cron_string+')',
      State: state.rule_enabled ? 'ENABLED' : 'DISABLED'
    }).promise().then(function() {
      return state.new_rule;
    });
  });
};