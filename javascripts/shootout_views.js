app.Views.Container = React.createClass({
  displayName: "Container",

  getInitialState: function () {
    return this.generateBlankState();
  },

  generateBlankState: function () {
    var questionCount = 16;
    var state = {
      players: [{
        id: 0,
        name: "",
        pronoun: "They",
        active: true
      }, {
        id: 1,
        name: "",
        pronoun: "They",
        active: true
      }],
      questions: this.makeQuestions(questionCount),
      question_count: questionCount,
      question_index: 0,
      resetting: false
    };

    var splitQuestions = this.divideQuestions(state.questions);
    state.players[0].questions = splitQuestions[0];
    state.players[1].questions = splitQuestions[1];
    state.even_questions = splitQuestions[0];
    state.odd_questions = splitQuestions[1];

    return state;
  },

  makeQuestions: function (num) {
    var questions = [];
    for (var i = 0; i < num; i++) {
      questions.push({
        id: i,
        state: "unanswered"
      });
    }
    return questions;
  },

  divideQuestions: function (questions) {
    var questions1 = [];
    var questions2 = [];
    var even = true;
    var arrayToAdd;

    for (var i = 0; i < questions.length; i++) {
      var arrayToAdd = even ? questions1 : questions2;
      arrayToAdd.push(questions[i]);
      even = !even;
    }

    return [questions1, questions2];
  },

  render: function () {
    return React.createElement(
      "div",
      { className: "container" },
      React.createElement(app.Views.Header, { question_index: this.state.question_index }),
      React.createElement(app.Views.Message, { game_state: this.state }),
      React.createElement(app.Views.Players, { players: this.state.players })
    );
  },

  componentDidMount: function () {
    var self = this;
    app.dispatcher.register(function (payload) {
      if (payload.actionType == "player-change") {
        var playerId = payload.data.id;
        var update = payload.data.attributes;
        var newState = _.clone(self.state);
        _.extend(newState.players[playerId], update);
        self.setState(newState);
      }

      if (payload.actionType == "question-answered") {
        var questionState = payload.data.state;
        var newState = _.clone(self.state);
        var playerId = payload.data.playerId;
        var otherPlayerId = 1 - playerId;

        if (playerId === 1 && newState.question_index === 0) {
          // flip the arrays
          newState.players[0].questions = newState.odd_questions;
          newState.players[1].questions = newState.even_questions;
        } else if (playerId === 0 && newState.question_index === 0) {
          newState.players[0].questions = newState.even_questions;
          newState.players[1].questions = newState.odd_questions;
        }

        newState.questions[newState.question_index].state = questionState;
        newState.question_index += 1;
        newState.players[playerId].active = false;
        newState.players[otherPlayerId].active = true;

        self.setState(newState);
      }

      if (payload.actionType == "undo") {
        var newState = _.clone(self.state);
        newState.question_index -= 1;
        newState.questions[newState.question_index].state = "unanswered";

        if (newState.question_index === 0) {
          newState.players[0].active = true;
          newState.players[1].active = true;
        } else {
          newState.players[0].active = !newState.players[0].active;
          newState.players[1].active = !newState.players[1].active;
        }

        self.setState(newState);
      }

      if (payload.actionType == "reset") {
        var newState;
        if (self.state.resetting) {
          newState = self.getInitialState();
        } else {
          newState = _.clone(self.state);
          newState.resetting = true;
        }

        self.setState(newState);
      }
    });
  }
});

app.Views.Header = React.createClass({
  displayName: "Header",


  render: function () {
    var questionNum = this.props.question_index + 1;
    return React.createElement(
      "div",
      { className: "row header" },
      React.createElement(
        "div",
        { className: "col-xs-12" },
        React.createElement(
          "h3",
          null,
          " Question #",
          questionNum,
          " "
        )
      )
    );
  }
});

app.Views.Message = React.createClass({
  displayName: "Message",

  handleUndo: function () {
    app.dispatcher.dispatch({
      actionType: "undo"
    });
  },

  handleReset: function () {
    app.dispatcher.dispatch({
      actionType: "reset"
    });
  },

  generateMessage: function () {
    var game_state = this.props.game_state;
    var players = game_state.players;
    var scores = this.calculateScores();
    var activePlayer = _.findWhere(players, { active: true });
    var otherPlayer = players[1 - activePlayer.id];
    var activePlayerScore = scores[activePlayer.id];
    var otherPlayerScore = scores[otherPlayer.id];

    var baseMessage = "The score is " + players[0].name + " " + scores[0] + ", " + players[1].name + " " + scores[1] + ".";

    var messages = [];

    var baseMessage = JSON.stringify(scores);

    var specialMessage = "";

    var halfway = game_state.question_index === game_state.question_count / 2;
    var remainingQuestions = game_state.question_count - game_state.question_index;
    var leadState = "in the lead";
    var giveScore = false;

    var aboutToWin = activePlayerScore.score === otherPlayerScore.maxPossibleScore;
    var aboutToLose = otherPlayerScore.score === activePlayerScore.maxPossibleScore;
    var lastQuestion = game_state.question_index + 1 === game_state.question_count;
    var gameOver = false;
    var winningPlayer;
    var winningPlayerScore;
    var losingPlayer;
    var losingPlayerScore;

    if (activePlayerScore.score > otherPlayerScore.maxPossibleScore) {
      winningPlayer = activePlayer;
      losingPlayer = otherPlayer;
      winningPlayerScore = activePlayerScore;
      losingPlayerScore = otherPlayerScore;
      gameOver = true;
    }

    if (otherPlayerScore.score > activePlayerScore.maxPossibleScore) {
      winningPlayer = otherPlayer;
      losingPlayer = activePlayer;
      winningPlayerScore = otherPlayerScore;
      losingPlayerScore = activePlayerScore;
      gameOver = true;
    }

    if (game_state.question_index === game_state.question_count) {
      gameOver = true;
    }

    if (gameOver) {
      if (winningPlayer) {
        return winningPlayer.name + " has won " + winningPlayerScore.score + " to " + losingPlayerScore.score + ".";
      } else {
        return activePlayer.name + " and " + otherPlayer.name + " have tied.";
      }
    }

    if (aboutToLose || aboutToWin) {
      giveScore = true;
    }

    if (activePlayerScore.score === otherPlayerScore.score) {
      leadState = "tied";
    } else if (activePlayerScore.score < otherPlayerScore.score) {
      leadState = "behind";
    }

    if (halfway) {
      giveScore = true;
      messages.push("We are halfway through our questions.");
    }

    if (giveScore) {
      messages.push(activePlayer.name + ", you're " + leadState + " " + activePlayerScore.score + " to " + otherPlayerScore.score + ".");
    }

    if (lastQuestion) {
      messages.push("This is the last question");
      if (aboutToWin) {
        messages.push("If you answer correctly, you'll win the game. If you miss, we'll go to a tiebreaker.");
      }
      if (aboutToLose) {
        messages.push("If you get this right, you stay in the game, and we'll go to a tiebreaker. If you miss, " + otherPlayer.name + " wins.");
      }
    } else {
      if (aboutToWin || aboutToLose) {
        messages.push("There are " + remainingQuestions + " questions remaining.");
      }
      if (aboutToWin) {
        messages.push("If you answer this question correctly, you'll win the game.");
      }

      if (aboutToLose) {
        messages.push("You must answer this correctly to stay in the game.  If you miss, " + otherPlayer.name + " wins.");
      }
    }

    return messages.join(" ");
  },

  calculateScores: function () {
    var questionsPerPlayer = this.props.game_state.question_count / 2;
    return this.props.game_state.players.map(function (player) {
      var score = 0;
      var lastAnsweredIndex = -1;
      var maxPossibleScore = 0;
      player.questions.forEach(function (question, i) {
        if (question.state === "correct") {
          score++;
          maxPossibleScore++;
          lastAnsweredIndex = i;
        }

        if (question.state === "wrong") {
          lastAnsweredIndex = i;
        }

        if (question.state === "unanswered") {
          maxPossibleScore++;
        }
      });
      return {
        score: score,
        maxPossibleScore: maxPossibleScore,
        lastAnsweredIndex: lastAnsweredIndex,
        remainingQuestions: questionsPerPlayer - lastAnsweredIndex - 1
      };
    });
  },

  render: function () {
    var resetMessage = this.props.game_state.resetting ? "Sure?" : "Reset";
    return React.createElement(
      "div",
      { className: "row message" },
      React.createElement(
        "div",
        { className: "col-xs-12" },
        React.createElement(
          "p",
          null,
          " ",
          this.generateMessage()
        ),
        React.createElement("br", null),
        React.createElement(
          "div",
          { className: "global-actions" },
          React.createElement(
            "button",
            { className: "btn", onClick: this.handleUndo },
            "Undo"
          ),
          React.createElement(
            "button",
            { className: "btn", onClick: this.handleReset },
            resetMessage
          )
        )
      )
    );
  }
});

app.Views.Players = React.createClass({
  displayName: "Players",

  render: function () {
    return React.createElement(
      "div",
      { className: "row players" },
      React.createElement(app.Views.Player, { player: this.props.players[0], position: "left" }),
      React.createElement(app.Views.Player, { player: this.props.players[1], position: "right" })
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
      actionType: "question-answered",
      data: {
        playerId: this.props.player.id,
        state: "correct"
      }
    });
  },

  handleWrong: function () {
    app.dispatcher.dispatch({
      actionType: "question-answered",
      data: {
        playerId: this.props.player.id,
        state: "wrong"
      }
    });
  },

  render: function () {
    return React.createElement(
      "div",
      { className: "col-xs-6 player " + this.props.position },
      React.createElement(
        "div",
        { className: "player-name form-inline" },
        React.createElement("input", {
          className: "form-control name",
          type: "text",
          value: this.props.player.name,
          onChange: this.handleNameChange
        }),
        React.createElement(
          "button",
          { className: "btn", onClick: this.handleEraseName },
          React.createElement("i", { className: "fa fa-ban" })
        ),
        React.createElement(
          "button",
          { className: "btn", onClick: this.handlePronounChange },
          this.props.player.pronoun
        )
      ),
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
        )
      ),
      React.createElement(app.Views.Answers, { questions: this.props.player.questions }),
      React.createElement(app.Views.Blanket, { show: !this.props.player.active })
    );
  }
});

app.Views.Answers = React.createClass({
  displayName: "Answers",

  render: function () {
    var correctCount = 0;
    var dots = this.props.questions.map(function (question) {
      var outerClasses = ["dot-outer"];
      var innerClasses = ["fa"];
      if (question.state == "unanswered") {
        innerClasses.push("fa-circle-thin");
      } else if (question.state == "correct") {
        outerClasses.push("green");
        innerClasses.push("fa-circle");
        correctCount++;
      } else if (question.state == "wrong") {
        outerClasses.push("red");
        innerClasses.push("fa-circle");
      }

      return React.createElement(
        "div",
        { key: question.id, className: outerClasses.join(" ") },
        React.createElement("i", { className: innerClasses.join(" ") })
      );
    });

    return React.createElement(
      "div",
      { className: "answers-progress" },
      React.createElement(
        "div",
        null,
        React.createElement(
          "p",
          null,
          correctCount
        )
      ),
      dots
    );
  }
});

app.Views.Blanket = React.createClass({
  displayName: "Blanket",

  render: function () {
    var className = this.props.show ? " show" : "";
    return React.createElement("div", { className: "blanket" + className });
  }
});

ReactDOM.render(React.createElement(app.Views.Container, null), $('.outer')[0]);