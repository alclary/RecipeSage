import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, ToastController, ModalController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe, Instruction, Ingredient } from '../../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider, RecipeTemplateModifiers } from '../../../providers/util-service/util-service';

@IonicPage({
  segment: 'recipe/:recipeId/print',
  priority: 'low'
})
@Component({
  selector: 'page-print-recipe',
  templateUrl: 'print-recipe.html',
  providers: [ RecipeServiceProvider ]
})
export class PrintRecipePage {

  recipe: Recipe;
  recipeId: string;
  ingredients: Ingredient[];
  instructions: Instruction[];

  scale: number = 1;

  selectedLabels: any = [];

  printedOn: string = (new Date).toDateString();

  printConfig: RecipeTemplateModifiers & { loading?: boolean } = {
    loading: true,
    version: (window as any).queryParams['version'],
    halfsheet: !!(window as any).queryParams['halfsheet'],
    verticalInstrIng: !!(window as any).queryParams['verticalInstrIng'],
    titleImage: !!(window as any).queryParams['titleImage'],
    hideNotes: !!(window as any).queryParams['hideNotes'],
    hideSource: !!(window as any).queryParams['hideSource'],
    hideSourceURL: !!(window as any).queryParams['hideSourceURL'],
    forPrinting: !!(window as any).queryParams['forPrinting'],
    showPrintButton: !!(window as any).queryParams['showPrintButton']
  };

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public loadingService: LoadingServiceProvider,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider) {

    this.recipeId = navParams.get('recipeId');
    this.recipe = <Recipe>{};

    this.applyScale();

    window.addEventListener('message', e => {
      console.log(e)
      if (!e.data || !e.data.action) return;
      if (e.data.action == 'print') this.print();
      if (e.data.action == 'updateConfig') {
        Object.assign(this.printConfig, e.data.printConfig || {});
      };
    });
  }

  ionViewWillEnter() {
    this.printConfig.loading = true;

    this.recipe = <Recipe>{};

    this.loadRecipe().then(() => {
      this.afterLoad();
    }, () => {
      this.afterLoad();
    });
  }

  afterLoad() {
    this.printConfig.loading = false;

    if (!!(window as any).queryParams['print']) {
      this.print(true);
    }
  }

  print(closeAfterPrint?: boolean) {
    window.print();
    if (closeAfterPrint) window.onafterprint = window.close;
  }

  loadRecipe() {
    return new Promise((resolve, reject) => {
      this.recipeService.fetchById(this.recipeId).subscribe(response => {
        this.recipe = response;

        if (this.recipe.url && !this.recipe.url.trim().startsWith('http')) {
          this.recipe.url = 'http://' + this.recipe.url.trim();
        }

        if (this.recipe.instructions && this.recipe.instructions.length > 0) {
          this.instructions = this.recipeService.parseInstructions(this.recipe.instructions);
        }

        this.applyScale();

        this.selectedLabels = this.recipe.labels.map(label => label.title)

        resolve();
      }, err => {
        switch(err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          case 404:
            let errorToast = this.toastCtrl.create({
              message: 'Recipe not found. Does this recipe URL exist?',
              duration: 30000,
              dismissOnPageChange: true
            });
            errorToast.present();
            break;
          default:
            errorToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }

        reject();
      });
    });
  }

  applyScale() {
    this.ingredients = this.recipeService.parseIngredients(this.recipe.ingredients, this.scale, true);
  }

  prettyDateTime(datetime) {
    if (!datetime) return '';
    return this.utilService.formatDate(datetime, { times: true });
  }
}
