app.store = {};

_.extend(app, {
  generateBlankState: function () {
    var questionCount = 16;
    var state = {
      players: [{
        id: 0,
        name: "",
        active: true,
        pronoun: "They"
      }, {
        id: 1,
        name: "",
        active: true,
        pronoun: "They"
      }],
      questions: this.makeQuestions(questionCount),
      question_count: questionCount,
      question_index: 0,
      resetting: false,
      even_player_id: 0
    };

    return state;
  },

  setupQuestions: function () {
    var state = app.store;

    var splitQuestions = this.divideQuestions(state.questions);

    state.players[state.even_player_id].questions = splitQuestions[0];
    state.players[1 - state.even_player_id].questions = splitQuestions[1];
    state.even_questions = splitQuestions[0];
    state.odd_questions = splitQuestions[1];
  },

  populateInitialState: function () {
    var data = localStorage.getItem('gameState');
    var gameState = data ? JSON.parse(data) : null;
    if (gameState) {
      app.store = gameState;
      app.store.resetting = false;
    } else {
      app.store = app.generateBlankState();
    }
    app.setupQuestions();
    return app.store;
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

  setState: function (newState) {
    app.store = newState;
    localStorage.setItem("gameState", JSON.stringify(newState));
  },

  resetState: function () {
    app.setState(app.generateBlankState());
  }
});

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

function ScoringState(gameState) {
  this.gameState = gameState;
  this.playerScores = this.generateScores();
  this.setDefaultPlayers();
  this.setPlayers();
}

_.extend(ScoringState.prototype, {
  generateScores: function () {
    var questionsPerPlayer = this.gameState.question_count / 2;
    return this.gameState.players.map(function (player) {
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
        remainingQuestions: questionsPerPlayer - lastAnsweredIndex - 1,
        player: player
      };
    });
  },

  setDefaultPlayers: function () {
    this.activePlayerScore = this.inactivePlayerScore = this.leadPlayerScore = this.behindPlayerScore = this.evenPlayerScore = this.oddPlayerScore = this.playerScores[0];
  },

  setPlayers: function () {
    var self = this;
    var highScore = -1;
    var lowScore = 999;
    this.playerScores.forEach(function (playerScore) {
      if (playerScore.score > highScore) {
        self.leadPlayerScore = playerScore;
        highScore = playerScore.score;
      }
      if (playerScore.score < lowScore) {
        self.behindPlayerScore = playerScore;
        lowScore = playerScore.score;
      }

      if (playerScore.player.active) {
        self.activePlayerScore = playerScore;
      } else {
        self.inactivePlayerScore = playerScore;
      }

      if (playerScore.player.questions === self.gameState.even_questions) {
        self.evenPlayerScore = playerScore;
      } else {
        self.oddPlayerScore = playerScore;
      }
    });
  },

  gameTied: function () {
    return this.playerScores[0].score === this.playerScores[1].score;
  },

  halfway: function () {
    return this.gameState.question_index === this.gameState.question_count / 2;
  },

  gameOver: function () {
    return this.leadPlayerScore.score > this.behindPlayerScore.maxPossibleScore || this.gameState.question_index === this.gameState.question_count;
  },

  aboutToWin: function () {
    return this.activePlayerScore.score === this.inactivePlayerScore.maxPossibleScore;
  },

  aboutToLose: function () {
    return this.inactivePlayerScore.score === this.activePlayerScore.maxPossibleScore;
  },

  winImminent: function () {
    return this.aboutToLose() || this.aboutToWin();
  },

  lastRound: function () {
    return this.gameState.question_index >= this.gameState.question_count - 2 && this.gameState.question_index < this.gameState.question_count;
  },

  lastQuestion: function () {
    return this.gameState.question_index === this.gameState.question_count - 1;
  },

  inTheLead: function () {
    return this.leadPlayerScore === this.activePlayerScore && !this.gameTied();
  },

  behind: function () {
    return this.behindPlayerScore === this.activePlayerScore && !this.gameTied();
  },

  evenPlayerActive: function () {
    return this.activePlayerScore === this.evenPlayerScore;
  },

  oddPlayerActive: function () {
    return this.activePlayerScore === this.oddPlayerScore;
  },

  endgameRound: function () {
    var round = [];
    var playerId = 0;
    var players = [{
      score: 0,
      maxPossibleScore: this.gameState.question_count / 2
    }, {
      score: 0,
      maxPossibleScore: this.gameState.question_count / 2
    }];
    var self = this;
    this.gameState.questions.forEach(function (question, i) {
      if (question.state === 'correct') {
        players[playerId].score += 1;
      } else if (question.state === 'wrong') {
        players[playerId].maxPossibleScore -= 1;
      }

      if (players[0].score === players[1].maxPossibleScore || players[1].score === players[0].maxPossibleScore) {
        round.push(i + 1);
      }

      playerId = 1 - playerId;
    });

    return round[0];
  },

  endgameRoundActive: function () {
    var endgameRound = this.endgameRound();
    return endgameRound === this.gameState.question_index;
  }

});

app.token = app.dispatcher.register(function (payload) {
  if (payload.actionType == "player-change") {
    var playerId = payload.data.id;
    var update = payload.data.attributes;
    var newState = _.clone(app.store);
    _.extend(newState.players[playerId], update);
    app.setState(newState);
  }

  if (payload.actionType == "question-answered") {
    var questionState = payload.data.state;
    var newState = _.clone(app.store);
    var playerId = payload.data.playerId;
    var otherPlayerId = 1 - playerId;

    if (playerId === 1 && newState.question_index === 0) {
      // flip the arrays
      newState.even_player_id = 1;
      newState.players[0].questions = newState.odd_questions;
      newState.players[1].questions = newState.even_questions;
    } else if (playerId === 0 && newState.question_index === 0) {
      newState.even_player_id = 0;
      newState.players[0].questions = newState.even_questions;
      newState.players[1].questions = newState.odd_questions;
    }

    newState.questions[newState.question_index].state = questionState;
    newState.question_index += 1;
    newState.players[playerId].active = false;
    newState.players[otherPlayerId].active = true;

    app.setState(newState);
  }

  if (payload.actionType == "undo") {
    var newState = _.clone(app.store);
    newState.question_index -= 1;
    newState.questions[newState.question_index].state = "unanswered";

    if (newState.question_index === 0) {
      newState.players[0].active = true;
      newState.players[1].active = true;
    } else {
      newState.players[0].active = !newState.players[0].active;
      newState.players[1].active = !newState.players[1].active;
    }

    app.setState(newState);
  }

  if (payload.actionType == "reset") {
    var newState;
    if (app.store.resetting) {
      newState = app.generateBlankState();
    } else {
      window.setTimeout(function () {
        app.dispatcher.dispatch({
          actionType: "cancel-reset"
        });
      }, 5000);
      newState = _.clone(app.store);
      newState.resetting = true;
    }

    app.setState(newState);
    app.setupQuestions();
  }

  if (payload.actionType == "cancel-reset") {
    var newState = _.clone(app.store);
    newState.resetting = false;

    app.setState(newState);
  }
});

app.Views.Container = React.createClass({
  displayName: "Container",

  getInitialState: function () {
    return app.populateInitialState();
  },

  render: function () {
    var scoringState = new ScoringState(this.state);
    var players = this.state.players.map(function (player) {
      return _.clone(player);
    });
    if (scoringState.gameOver()) {
      players.forEach(function (player) {
        player.active = false;
      });
    }
    return React.createElement(
      "div",
      { className: "container" },
      React.createElement(app.Views.Header, {
        question_index: this.state.question_index,
        scoring_state: scoringState
      }),
      React.createElement(app.Views.Message, {
        scoring_state: scoringState,
        resetting: this.state.resetting
      }),
      React.createElement(app.Views.Players, { players: players })
    );
  },

  componentDidMount: function () {
    var self = this;
    app.dispatcher.register(function (payload) {
      app.dispatcher.waitFor([app.token]);
      self.setState(app.store);
    });
  }
});

app.Views.Header = React.createClass({
  displayName: "Header",


  render: function () {
    var questionNum = this.props.question_index + 1;
    var text = this.props.scoring_state.gameOver() ? "Game Over" : "Question #" + questionNum;
    return React.createElement(
      "div",
      { className: "row header" },
      React.createElement(
        "div",
        { className: "col-xs-12" },
        React.createElement(
          "h4",
          null,
          text
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
    var scoringState = this.props.scoring_state;
    var messages = [];

    if (scoringState.gameOver()) {
      if (scoringState.gameTied()) {
        return "We are tied";
      } else {
        return scoringState.leadPlayerScore.player.name + " has won " + this.scoreMessage() + ".";
      }
    };

    if (scoringState.halfway() && !scoringState.winImminent()) {
      messages.push("We are at the halfway point.");
      if (scoringState.gameTied()) {
        messages.push("The game is tied at " + scoringState.leadPlayerScore.score + " points each.");
      } else {
        messages.push(scoringState.leadPlayerScore.player.name + " is in the lead, " + this.scoreMessage() + ".");
      }
    }

    if (scoringState.winImminent() && !scoringState.lastRound()) {
      if (scoringState.endgameRoundActive()) {
        messages.push("Here's the situation.");
      }
      if (scoringState.aboutToLose()) {
        // [LEADER] is in the lead [X-Y]. [LOSER], if you get one more question wrong, or if [LEADER] answers one more question correctly, [LEADER] will win the game.
        messages.push(scoringState.leadPlayerScore.player.name + " is in the lead " + this.scoreMessage() + ". " + scoringState.behindPlayerScore.player.name + ", if you get one more question wrong, " + "or if " + scoringState.leadPlayerScore.player.name + " answers one more question correctly, " + scoringState.leadPlayerScore.player.name + " will win the game.");
      } else if (scoringState.aboutToWin()) {
        messages.push("The score is " + this.scoreMessage() + ".");
        messages.push(scoringState.leadPlayerScore.player.name + ", if you get this question right, you win.");
      }
    }

    if (scoringState.lastRound()) {
      if (scoringState.evenPlayerActive()) {

        if (scoringState.gameTied()) {
          messages.push("The score is tied.");
          messages.push("You each have one question left.");
        } else if (scoringState.aboutToWin()) {
          messages.push("The score is " + this.scoreMessage() + ".");
          messages.push("You each have one question left.");
          messages.push(scoringState.leadPlayerScore.player.name + ", if you get this question right, you win.");
        } else if (scoringState.aboutToLose()) {
          messages.push("The score is " + this.scoreMessage() + ".");
          messages.push("You each have one question left.");
          messages.push(scoringState.behindPlayerScore.player.name + ", to stay in the game, you must answer this question correctly, and " + scoringState.leadPlayerScore.player.name + " has to miss " + app.pronounTranslator[scoringState.leadPlayerScore.player.pronoun].possessive + " question.");
        }
      } else if (scoringState.oddPlayerActive()) {

        if (scoringState.gameTied()) {
          messages.push("The score is tied.");
          messages.push("This is the last question.");
          messages.push(scoringState.activePlayerScore.player.name + ", if you answer this question correctly, you win.");
        } else if (scoringState.aboutToLose()) {
          messages.push("The score is " + this.scoreMessage() + ".");
          messages.push("This is the last question.");
          messages.push(scoringState.behindPlayerScore.player.name + ", you must answer this question correctly to stay in the game and force a tiebreaker.");
        }
      }
    }

    return messages.join(" ");
  },

  scoreMessage: function () {
    return this.props.scoring_state.leadPlayerScore.score + " to " + this.props.scoring_state.behindPlayerScore.score;
  },

  render: function () {
    var resetMessage = this.props.resetting ? "Sure?" : "Reset";
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
        ),
        React.createElement(app.Views.Blanket, { show: !this.props.player.active })
      ),
      React.createElement(app.Views.Answers, { questions: this.props.player.questions })
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

$(function () {
  ReactDOM.render(React.createElement(app.Views.Container, null), $('.outer')[0]);
});