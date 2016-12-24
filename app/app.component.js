"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var table_component_1 = require('./table.component');
var Column1 = (function (_super) {
    __extends(Column1, _super);
    function Column1() {
        _super.apply(this, arguments);
    }
    Column1 = __decorate([
        core_1.Component({ template: '{{data.first}}' }), 
        __metadata('design:paramtypes', [])
    ], Column1);
    return Column1;
}(table_component_1.BasicColumnComponent));
exports.Column1 = Column1;
var Column2 = (function (_super) {
    __extends(Column2, _super);
    function Column2() {
        _super.apply(this, arguments);
    }
    Column2 = __decorate([
        core_1.Component({
            template: "\n    <ul>\n      <li *ngFor=\"let s of data.third\">{{s}}</li>\n    </ul>"
        }), 
        __metadata('design:paramtypes', [])
    ], Column2);
    return Column2;
}(table_component_1.BasicColumnComponent));
exports.Column2 = Column2;
var Column3 = (function (_super) {
    __extends(Column3, _super);
    function Column3() {
        _super.apply(this, arguments);
    }
    Column3 = __decorate([
        core_1.Component({ template: '<p>{{data.first}} - {{data.second}}</p>' }), 
        __metadata('design:paramtypes', [])
    ], Column3);
    return Column3;
}(table_component_1.BasicColumnComponent));
exports.Column3 = Column3;
var AppComponent = (function () {
    function AppComponent(changeDetector) {
        this.changeDetector = changeDetector;
        this.selectable = true;
        this.numberOfRows = 5000;
        this.columns1 = [
            { title: "Column 1", component: Column1, numeric: true },
            { title: "Column 2", component: Column2 },
            { title: "Column 3", component: Column3 },
            { title: "Column 4", func: function (x) { return x.second; } },
            { title: "Column 5", func: function (x) { return x.first; } },
        ];
        this.columns2 = [
            { title: "Column 1", func: function (x) { return String(x.first); } },
            { title: "Column 2", func: function (x) { return x.second; } }
        ];
    }
    AppComponent.prototype.tableSelect = function (event) {
        console.log(event);
    };
    AppComponent.prototype.ngAfterViewInit = function () {
        this.updateData();
    };
    AppComponent.prototype.updateData = function () {
        this.data = Array(this.numberOfRows).fill(0).map(function (_, i) { return ({ first: i, second: "b" + (3000 - i), third: ["a" + i, "b" + i] }); });
        this.changeDetector.detectChanges();
        var tables = this.tableComponents.toArray();
        tables[1].setData({ columns: this.columns1, data: this.data });
    };
    __decorate([
        core_1.ViewChildren(table_component_1.TableComponent), 
        __metadata('design:type', core_1.QueryList)
    ], AppComponent.prototype, "tableComponents", void 0);
    AppComponent = __decorate([
        core_1.Component({
            selector: 'my-app',
            template: "\n    <h1>Responsive Data Tables</h1>\n    Number of data rows: <input [(ngModel)]=\"numberOfRows\" (ngModelChange)=\"updateData()\" type=\"number\">\n    <label> With checkboxes <input type=\"checkbox\" [(ngModel)]=\"selectable\"></label>\n    <data-table [title]=\"Example\" [columns]=\"columns1\" [data]=\"data\" [selectable]=\"selectable\" (selectionChange)=\"tableSelect($event)\"></data-table>\n    <data-table [title]=\"Example2\"></data-table>\n  ",
        }), 
        __metadata('design:paramtypes', [core_1.ChangeDetectorRef])
    ], AppComponent);
    return AppComponent;
}());
exports.AppComponent = AppComponent;
//# sourceMappingURL=app.component.js.map