var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');
var sanitizeHtml = require('sanitize-html');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

// SharedUtils
var SharedUtils = require('../../SharedUtils');

router.get('/', (req, res, next) => {
  let originalModifiers = req.query.modifiers ? req.query.modifiers.split(',') : [];

  let mappedModifiers = {
    titleImage: originalModifiers.indexOf('noimage') !== -1 && req.query.template != 'compact',
    halfsheet: originalModifiers.indexOf('halfsheet') !== -1 || req.query.template == 'compact' || req.query.template == 'halfsheet',
  };

  let modifierQuery = Object.keys(mappedModifiers).filter(m => mappedModifiers[m]).map(modifier => `&${modifier}=true`).join('')

  let redirectBase = req.headers.proxypassbase || '/';
  res.redirect(302, `${redirectBase}print/${req.query.recipeId}?version=legacy${modifierQuery}`);
})

router.get('/:recipeId',
  MiddlewareService.validateSession(['user'], true),
  function (req, res, next) {

  if (!req.query.version) return res.status(400).send("Missing parameter: version");

  var modifiers = {
    version: req.query.version,
    halfsheet: !!req.query.halfsheet,
    twocolIngr: !!req.query.twocolIngr,
    verticalInstrIng: !!req.query.verticalInstrIng,
    titleImage: !!req.query.titleImage,
    hideNotes: !!req.query.hideNotes,
    hideSource: !!req.query.hideSource,
    hideSourceURL: !!req.query.hideSourceURL,
    forPrinting: !!req.query.forPrinting,
    showPrintButton: !!req.query.showPrintButton
  };

  Recipe.findOne({
    where: {
      id: req.params.recipeId
    },
    include: [
      {
        model: Label,
        as: 'labels'
      }
    ]
  }).then(function(rObj) {
    if (!rObj) {
      res.render('error', {
        message: '404',
        error: {
          status: 'Recipe not found',
          stack: ''
        }
      });
    } else {
      let recipe = rObj.toJSON();

      recipe.isOwner = res.locals.session ? res.locals.session.userId == recipe.userId : false;

      // There should be no fromUser after recipes have been moved out of the inbox
      if (recipe.folder !== 'inbox' || !recipe.isOwner) delete recipe.fromUser;

      if (!recipe.isOwner) recipe.labels = [];

      recipe.instructions = SharedUtils.parseInstructions(sanitizeHtml(recipe.instructions));
      recipe.ingredients = SharedUtils.parseIngredients(sanitizeHtml(recipe.ingredients), 1, true);

      if (!modifiers.titleImage) {
        delete recipe.image;
      }

      res.render('recipe-default', { recipe: recipe, date: (new Date).toDateString(), modifiers: modifiers });
    }
  }).catch(function(err) {
    res.render('error', {
      message: '500',
      error: {
        status: 'Error while loading recipe',
        stack: ''
      }
    });

    next(err);
  });
});

module.exports = router;
