app.store = {};

_.extend(app, {
  generateBlankState: function() {
    var questionCount = 16;
    var state = {
      players: [
        {
          id: 0,
          name: "",
          active: true
        },
        {
          id: 1,
          name: "",
          active: true
        }
      ],
      questions: this.makeQuestions(questionCount),
      question_count: questionCount,
      question_index: 0,
      resetting: false
    };

    return state;
  },

  setupQuestions: function() {
    var state = app.store;

    var splitQuestions = this.divideQuestions(state.questions);
    state.players[0].questions = splitQuestions[0];
    state.players[1].questions = splitQuestions[1];
    state.even_questions = splitQuestions[0];
    state.odd_questions = splitQuestions[1];
  },

  populateInitialState: function() {
    var data = localStorage.getItem('gameState');
    var gameState = data ? JSON.parse(data) : null;
    if(gameState) {
      app.store = gameState;
    } else {
      app.store = app.generateBlankState();
    }
    app.setupQuestions();
    return app.store;
  },

  makeQuestions: function(num) {
    var questions = [];
    for(var i = 0; i < num; i++) {
      questions.push({
        id: i,
        state: "unanswered"
      });
    }
    return questions;
  },

  divideQuestions: function(questions) {
    var questions1 = [];
    var questions2 = [];
    var even = true;
    var arrayToAdd;

    for(var i=0; i < questions.length; i++) {
      var arrayToAdd = even ? questions1 : questions2;
      arrayToAdd.push(questions[i]);
      even = !even;
    }

    return [questions1, questions2];
  },

  setState: function(newState) {
    app.store = newState;
    localStorage.setItem("gameState", JSON.stringify(newState));
  },

  resetState: function() {
    app.setState(app.generateBlankState());
  }
});


app.token = app.dispatcher.register(function(payload) {
  if(payload.actionType == "player-change") {
    var playerId = payload.data.id;
    var update = payload.data.attributes;
    var newState = _.clone(app.store);
    _.extend(newState.players[playerId], update);
    app.setState(newState);
  }

  if(payload.actionType == "question-answered") {
    var questionState = payload.data.state;
    var newState = _.clone(app.store);
    var playerId = payload.data.playerId;
    var otherPlayerId = 1 - playerId;

    if(playerId === 1 && newState.question_index === 0) {
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

    app.setState(newState);
  }

  if(payload.actionType == "undo") {
    var newState = _.clone(app.store);
    newState.question_index -= 1;
    newState.questions[newState.question_index].state = "unanswered";

    if(newState.question_index === 0) {
      newState.players[0].active = true;
      newState.players[1].active = true;
    } else {
      newState.players[0].active = !newState.players[0].active;
      newState.players[1].active = !newState.players[1].active;
    }

    app.setState(newState);
  }

  if(payload.actionType == "reset") {
    var newState;
    if(app.store.resetting) {
      newState = app.generateBlankState();
    } else {
      newState = _.clone(app.store);
      newState.resetting = true;
    }

    app.setState(newState);
    app.setupQuestions();
  }
});

app.Views.Container = React.createClass({
  getInitialState: function() {
    return app.populateInitialState();
  },

  render: function() {
    return <div className="container">
      <app.Views.Header question_index={this.state.question_index} />
      <app.Views.Message game_state={this.state} />
      <app.Views.Players players={this.state.players} />
    </div>
  },

  componentDidMount: function() {
    var self = this;
    app.dispatcher.register(function(payload) {
      app.dispatcher.waitFor([app.token]);
      self.setState(app.store);
    });
  }
});

app.Views.Header = React.createClass({

  render: function() {
    var questionNum = this.props.question_index + 1;
    return <div className="row header">
      <div className="col-xs-12">
        <h3> Question #{questionNum} </h3>
      </div>
    </div>
  }
});

app.Views.Message = React.createClass({
  handleUndo: function() {
    app.dispatcher.dispatch({
      actionType: "undo"
    });
  },

  handleReset: function() {
    app.dispatcher.dispatch({
      actionType: "reset"
    });
  },

  generateMessage: function() {
    var game_state = this.props.game_state;
    var players = game_state.players;
    var scores = this.calculateScores();
    var activePlayer = _.findWhere(players, {active: true});
    var otherPlayer = players[1 - activePlayer.id];
    var activePlayerScore = scores[activePlayer.id];
    var otherPlayerScore = scores[otherPlayer.id];

    var baseMessage = "The score is " + players[0].name + " " + scores[0] + ", " + players[1].name + " " + scores[1] + ".";

    var messages = [];

    var baseMessage = JSON.stringify(scores);

    var specialMessage = "";

    var halfway = game_state.question_index === (game_state.question_count / 2)
    var remainingQuestions = game_state.question_count - game_state.question_index;
    var leadState = "in the lead";
    var giveScore = false;

    var aboutToWin = activePlayerScore.score === otherPlayerScore.maxPossibleScore;
    var aboutToLose = otherPlayerScore.score === activePlayerScore.maxPossibleScore;
    var lastQuestion = game_state.question_index + 1 === game_state.question_count
    var gameOver = false;
    var winningPlayer;
    var winningPlayerScore;
    var losingPlayer;
    var losingPlayerScore;

    if(activePlayerScore.score > otherPlayerScore.maxPossibleScore) {
      winningPlayer = activePlayer;
      losingPlayer = otherPlayer;
      winningPlayerScore = activePlayerScore;
      losingPlayerScore = otherPlayerScore;
      gameOver = true;
    }

    if(otherPlayerScore.score > activePlayerScore.maxPossibleScore) {
      winningPlayer = otherPlayer;
      losingPlayer = activePlayer;
      winningPlayerScore = otherPlayerScore;
      losingPlayerScore = activePlayerScore;
      gameOver = true;
    }

    if(game_state.question_index === game_state.question_count) {
      gameOver = true;
    }

    if(gameOver) {
      if(winningPlayer) {
        return winningPlayer.name + " has won " + winningPlayerScore.score + " to " + losingPlayerScore.score + ".";
      } else {
        return activePlayer.name + " and " + otherPlayer.name + " have tied.";
      }

    }

    if(aboutToLose || aboutToWin) {
      giveScore = true;
    }

    if(activePlayerScore.score === otherPlayerScore.score) {
      leadState = "tied";
    } else if (activePlayerScore.score < otherPlayerScore.score) {
      leadState = "behind";
    }

    if(halfway) {
      giveScore = true;
      messages.push("We are halfway through our questions.");
    }

    if(giveScore) {
      messages.push(activePlayer.name + ", you're " + leadState + " " + activePlayerScore.score + " to " + otherPlayerScore.score + ".");
    }

    if(lastQuestion) {
      messages.push("This is the last question");
      if(aboutToWin) {
        messages.push("If you answer correctly, you'll win the game. If you miss, we'll go to a tiebreaker.");
      }
      if(aboutToLose) {
        messages.push("If you get this right, you stay in the game, and we'll go to a tiebreaker. If you miss, " + otherPlayer.name + " wins.");
      }
    } else {
      if(aboutToWin || aboutToLose){
        messages.push("There are " + remainingQuestions + " questions remaining.");
      }
      if(aboutToWin) {
        messages.push("If you answer this question correctly, you'll win the game.");
      }

      if(aboutToLose) {
        messages.push("You must answer this correctly to stay in the game.  If you miss, " + otherPlayer.name + " wins.");
      }
    }

    return messages.join(" ");
  },

  calculateScores: function() {
    var questionsPerPlayer = this.props.game_state.question_count / 2;
    return this.props.game_state.players.map(function(player) {
      var score = 0;
      var lastAnsweredIndex = -1;
      var maxPossibleScore = 0;
      player.questions.forEach(function(question, i) {
        if(question.state === "correct") {
          score++;
          maxPossibleScore++;
          lastAnsweredIndex = i;
        }

        if(question.state === "wrong") {
          lastAnsweredIndex = i;
        }

        if(question.state === "unanswered") {
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

  render: function() {
    var resetMessage = this.props.game_state.resetting ? "Sure?" : "Reset";
    return <div className="row message">
      <div className="col-xs-12">
        <p> {this.generateMessage()}</p>
        <br />
        <div className="global-actions">
          <button className="btn" onClick={this.handleUndo}>Undo</button>
          <button className="btn" onClick={this.handleReset}>{resetMessage}</button>
        </div>
      </div>
    </div>
  }
});

app.Views.Players = React.createClass({
  render: function() {
    return <div className="row players">
      <app.Views.Player player={this.props.players[0]} position={"left"} />
      <app.Views.Player player={this.props.players[1]} position={"right"} />
    </div>
  }
});

app.Views.Player = React.createClass({
  handleNameChange: function(evt) {
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

  handleEraseName: function(evt) {
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

  handlePronounChange: function() {
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

  handleCorrect: function() {
    app.dispatcher.dispatch({
      actionType: "question-answered",
      data: {
        playerId: this.props.player.id,
        state: "correct"
      }
    });
  },

  handleWrong: function() {
    app.dispatcher.dispatch({
      actionType: "question-answered",
      data: {
        playerId: this.props.player.id,
        state: "wrong"
      }
    });
  },

  render: function () {
    return <div className={"col-xs-6 player " + this.props.position}>
      <div className="player-name form-inline">
        <input 
          className="form-control name" 
          type="text" 
          value={this.props.player.name} 
          onChange={this.handleNameChange}
        />
        <button className="btn" onClick={this.handleEraseName}><i className="fa fa-ban"></i></button>
      </div>
      <div className="actions">
        <div className="action-outer">
          <button className="btn btn-success" onClick={this.handleCorrect}>
            <i className="fa fa-check"></i>
          </button>
        </div>
        <div className="action-outer">
          <button className="btn btn-danger" onClick={this.handleWrong}>
            <i className="fa fa-times"></i>
          </button>
        </div>
        <app.Views.Blanket show={!this.props.player.active} />
      </div>
      <app.Views.Answers questions={this.props.player.questions} />
    </div>
  }
});

app.Views.Answers = React.createClass({
  render: function() {
    var correctCount = 0;
    var dots = this.props.questions.map(function(question) {
      var outerClasses = ["dot-outer"];
      var innerClasses = ["fa"];
      if(question.state == "unanswered") {
        innerClasses.push("fa-circle-thin");
      } else if(question.state == "correct") {
        outerClasses.push("green");
        innerClasses.push("fa-circle");
        correctCount++;
      } else if(question.state == "wrong") {
        outerClasses.push("red");
        innerClasses.push("fa-circle");
      }

      return <div key={question.id} className={outerClasses.join(" ")}>
        <i className={innerClasses.join(" ")}></i>
      </div>
    });

    return <div className="answers-progress">
      <div>
        <p>{correctCount}</p>
      </div>
      {dots}
    </div>
  }
});

app.Views.Blanket = React.createClass({
  render: function() {
    var className = this.props.show ? " show" : "";
    return <div className={"blanket" + className}>
    </div>
  }
});

$(function() {
  ReactDOM.render(
    <app.Views.Container />,
    $('.outer')[0]
  );
});
