app.pronounTranslator = {
  "They": {
    possessive: "their",
    pronoun: "they"
  },
  "He": {
    possessive: "his",
    pronoun: "he"
  },
  "She": {
    possessive: "her",
    pronoun: "she"
  }
};

app.scorer = new CategoryScorer();

app.token = app.dispatcher.register(function (payload) {
  if (payload.actionType === 'answer-question') {
    var playerId = payload.data.playerId;
    app.scorer.answerQuestion(playerId);
  }
  if (payload.actionType === 'next-question') {
    var playerId = payload.data.playerId;
    app.scorer.nextQuestion();
  }
  if (payload.actionType === 'answer-question-wrong') {
    var playerId = payload.data.playerId;
    app.scorer.answerWrong(playerId);
  }
  if (payload.actionType === 'bank-points') {
    app.scorer.nextCategory();
  }
  if (payload.actionType === 'claim-question') {
    app.scorer.claimQuestion();
  }
});

app.Views.Container = React.createClass({
  displayName: "Container",

  getInitialState: function () {
    return app.scorer.state;
  },
  render: function () {
    return React.createElement(
      "div",
      { className: "container" },
      React.createElement(app.Views.Players, {
        players: this.state.players,
        category: this.state.currentCategory,
        question: this.state.currentQuestion,
        maxScore: this.state.winScore
      })
    );
  },
  componentDidMount: function () {
    var self = this;
    app.dispatcher.register(function (payload) {
      app.dispatcher.waitFor([app.token]);
      self.setState(app.scorer.state);
    });
  }
});

app.Views.Answers = React.createClass({
  displayName: "Answers",

  render: function () {
    var dots = [];
    for (var i = 0; i < this.props.maxScore; i++) {
      var className = "fa fa-circle-thin";
      if (i < this.props.score) {
        className = "fa fa-circle";
      }
      dots.push(React.createElement(
        "div",
        { key: i },
        React.createElement("i", { className: className })
      ));
    }

    return React.createElement(
      "div",
      { className: "answers-progress" },
      React.createElement(
        "div",
        null,
        React.createElement(
          "p",
          null,
          this.props.score
        )
      ),
      dots
    );
  }
});

app.Views.Players = React.createClass({
  displayName: "Players",

  render: function () {
    return React.createElement(
      "div",
      { className: "row players" },
      React.createElement(app.Views.Player, {
        player: this.props.players[0],
        position: "left",
        question: this.props.question,
        category: this.props.category,
        maxScore: this.props.maxScore
      }),
      React.createElement(app.Views.CategoryProgress, { questions: this.props.category.questions }),
      React.createElement(app.Views.Player, {
        player: this.props.players[1],
        position: "right",
        question: this.props.question,
        category: this.props.category,
        maxScore: this.props.maxScore
      })
    );
  }
});

app.Views.Player = React.createClass({
  displayName: "Player",

  handleNameChange: function (evt) {
    app.dispatcher.dispatch({
      actionType: "player-change",
      data: {
        id: this.props.player.id,
        attributes: {
          name: evt.target.value
        }
      }
    });
  },

  handleEraseName: function (evt) {
    app.dispatcher.dispatch({
      actionType: "player-change",
      data: {
        id: this.props.player.id,
        attributes: {
          name: ""
        }
      }
    });
  },

  pronouns: ["They", "She", "He"],

  handlePronounChange: function () {
    var current = this.props.player.pronoun;
    var index = this.pronouns.indexOf(current);
    index = index >= this.pronouns.length - 1 ? 0 : index + 1;
    app.dispatcher.dispatch({
      actionType: "player-change",
      data: {
        id: this.props.player.id,
        attributes: {
          pronoun: this.pronouns[index]
        }
      }
    });
  },

  handleCorrect: function () {
    app.dispatcher.dispatch({
      actionType: 'answer-question',
      data: {
        playerId: this.props.player.id
      }
    });
  },

  handleWrong: function () {
    app.dispatcher.dispatch({
      actionType: 'answer-question-wrong',
      data: {
        playerId: this.props.player.id
      }
    });
  },

  render: function () {
    var question = this.props.question;
    var category = this.props.category;

    var isCategoryOwner = this.props.player.id === category.owner;
    var categoryIsOpen = category.owner === null;
    var questionUnclaimed = question.state === enums.questionStates.UNCLAIMED;

    var showBlanket = !categoryIsOpen && !isCategoryOwner || questionUnclaimed;
    var showControls = isCategoryOwner && questionUnclaimed;

    return React.createElement(
      "div",
      { className: "col-xs-5 player " + this.props.position },
      React.createElement(
        "div",
        { className: "actions" },
        React.createElement(
          "div",
          { className: "action-outer" },
          React.createElement(
            "button",
            { className: "btn btn-success", onClick: this.handleCorrect },
            React.createElement("i", { className: "fa fa-check" })
          )
        ),
        React.createElement(
          "div",
          { className: "action-outer" },
          React.createElement(
            "button",
            { className: "btn btn-danger", onClick: this.handleWrong },
            React.createElement("i", { className: "fa fa-times" })
          )
        ),
        React.createElement(app.Views.Blanket, { show: showBlanket, showControls: showControls, player: this.props.player })
      ),
      React.createElement(app.Views.Answers, { score: this.props.player.score, maxScore: this.props.maxScore })
    );
  }
});

app.Views.CategoryProgress = React.createClass({
  displayName: "CategoryProgress",

  render: function () {
    var questions = [];
    for (var i = 0; i < this.props.questions.length; i++) {
      var question = this.props.questions[i];
      var className = "fa fa-square-o";
      var categoryScore = 0;
      if (question.state === enums.questionStates.ANSWERED || question.state === enums.questionStates.STOLEN) {
        className = "fa fa-square";
        categoryScore++;
      }

      questions.push(React.createElement(
        "div",
        { key: question.id },
        React.createElement("i", { className: className })
      ));
    }
    return React.createElement(
      "div",
      { className: "col-xs-2 category-progress" },
      React.createElement(
        "div",
        { className: "category-score" },
        categoryScore
      ),
      questions
    );
  }
});

app.Views.Blanket = React.createClass({
  displayName: "Blanket",

  render: function () {
    var controls = null;
    if (this.props.showControls) {
      controls = React.createElement(
        "div",
        { className: "actions" },
        React.createElement(
          "div",
          { className: "action-outer" },
          React.createElement(
            "button",
            { className: "btn", onClick: this.handlePush },
            "Push Luck"
          )
        ),
        React.createElement(
          "div",
          { className: "action-outer" },
          React.createElement(
            "button",
            { className: "btn", onClick: this.handleBank },
            "Bank Points"
          )
        )
      );
    }

    var className = this.props.show ? " show" : "";
    return React.createElement(
      "div",
      { className: "blanket" + className },
      controls
    );
  },
  handlePush: function () {
    app.dispatcher.dispatch({
      actionType: 'claim-question'
    });
  },
  handleBank: function () {
    app.dispatcher.dispatch({
      actionType: 'bank-points'
    });
  }
});

$(function () {
  ReactDOM.render(React.createElement(app.Views.Container, null), $('.outer')[0]);
});