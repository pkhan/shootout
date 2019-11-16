app.pronounTranslator = {
    "They": {
      possessive: "their",
      pronoun: "they",
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

app.token = app.dispatcher.register(function(payload) {
  if(payload.actionType === 'answer-question') {
    var playerId = payload.data.playerId;
    app.scorer.answerQuestion(playerId);
  }
  if(payload.actionType === 'next-question') {
    var playerId = payload.data.playerId;
    app.scorer.nextQuestion();
  }
  if(payload.actionType === 'answer-question-wrong') {
    var playerId = payload.data.playerId;
    app.scorer.answerWrong(playerId);
  }
  if(payload.actionType === 'bank-points') {
    app.scorer.nextCategory();
  }
  if(payload.actionType === 'claim-question') {
    app.scorer.claimQuestion();
  }

});

app.Views.Container = React.createClass({
    getInitialState: function() {
        return app.scorer.state;
    },
    render: function() {
        return <div className="container">
          <app.Views.Players 
            players={this.state.players} 
            category={this.state.currentCategory} 
            question={this.state.currentQuestion} 
            maxScore={this.state.winScore}
          />
        </div>
    },
    componentDidMount: function() {
      var self = this;
      app.dispatcher.register(function(payload) {
        app.dispatcher.waitFor([app.token]);
        self.setState(app.scorer.state);
      });
    }
});

app.Views.Answers = React.createClass({
  render: function() {
    var dots = [];
    for(var i = 0; i < this.props.maxScore; i++){
      var className = "fa fa-circle-thin";
      if(i < this.props.score) {
        className = "fa fa-circle";
      }
      dots.push(<div key={i}>
        <i className={className}></i>
      </div>);
    }
    
    return <div className="answers-progress">
      <div>
        <p>{this.props.score}</p>
      </div>
      {dots}
    </div>
  }
});

app.Views.Players = React.createClass({
    render: function() {
      return <div className="row players">
        <app.Views.Player 
          player={this.props.players[0]} 
          position={"left"} 
          question={this.props.question} 
          category={this.props.category} 
          maxScore={this.props.maxScore}
        />
        <app.Views.CategoryProgress questions={this.props.category.questions} />
        <app.Views.Player 
          player={this.props.players[1]} 
          position={"right"} 
          question={this.props.question} 
          category={this.props.category} 
          maxScore={this.props.maxScore}
        />
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
        actionType: 'answer-question',
        data: {
          playerId: this.props.player.id
        }
      });
    },
  
    handleWrong: function() {
      app.dispatcher.dispatch({
        actionType: 'answer-question-wrong',
        data: {
          playerId: this.props.player.id,
        }
      });
    },
  
    render: function () {
      var question = this.props.question;
      var category = this.props.category;

      var isCategoryOwner = this.props.player.id === category.owner;
      var categoryIsOpen = category.owner === null;
      var questionUnclaimed = question.state === enums.questionStates.UNCLAIMED;

      var showBlanket = (!categoryIsOpen && !isCategoryOwner) || (questionUnclaimed);
      var showControls = (isCategoryOwner && questionUnclaimed);

      return <div className={"col-xs-5 player " + this.props.position}>
        {/* <div className="player-name form-inline">
          <input 
            className="form-control name" 
            type="text" 
            value={this.props.player.name} 
            onChange={this.handleNameChange}
          />
          <button className="btn" onClick={this.handlePronounChange}>{this.props.player.pronoun}</button>
        </div> */}
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
          <app.Views.Blanket show={showBlanket} showControls={showControls} player={this.props.player} />
        </div>
        <app.Views.Answers score={this.props.player.score} maxScore={this.props.maxScore} />
      </div>
    }
  });

  app.Views.CategoryProgress = React.createClass({
    render: function() {
      var questions = [];
      for(var i = 0; i < this.props.questions.length; i++) {
        var question = this.props.questions[i];
        var className = "fa fa-square-o";
        var categoryScore = 0;
        if(question.state === enums.questionStates.ANSWERED || question.state === enums.questionStates.STOLEN) {
          className = "fa fa-square";
          categoryScore++;
        }

        questions.push(<div key={question.id}>
          <i className={className}></i>
        </div>
        )
      }
      return <div className="col-xs-2 category-progress">
        <div className="category-score">{categoryScore}</div>
        {questions}
      </div>
    }
  });

  app.Views.Blanket = React.createClass({
    render: function() {
      var controls = null;
      if(this.props.showControls) {
        controls = <div className="actions">
          <div className="action-outer">
            <button className="btn" onClick={this.handlePush}>
              Push Luck
            </button>
          </div>
          <div className="action-outer">
            <button className="btn" onClick={this.handleBank}>
              Bank Points
            </button>
          </div>
        </div>
      }

      var className = this.props.show ? " show" : "";
      return <div className={"blanket" + className}>
        {controls}
      </div>
    },
    handlePush: function() {
      app.dispatcher.dispatch({
        actionType: 'claim-question'
      });
    },
    handleBank: function() {
      app.dispatcher.dispatch({
        actionType: 'bank-points'
      });
    }
  });
  
  $(function() {
    ReactDOM.render(
      <app.Views.Container />,
      $('.outer')[0]
    );
  });