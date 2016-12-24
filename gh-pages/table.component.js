"use strict";
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
/**
 * Base class for custom column components. It provides the basic boilerplate
 * needed for a component which exports the contained data from the "data"
 * property.
 */
var BasicColumnComponent = (function () {
    function BasicColumnComponent() {
    }
    BasicColumnComponent.prototype.setData = function (data) {
        this.data = data;
    };
    return BasicColumnComponent;
}());
exports.BasicColumnComponent = BasicColumnComponent;
/**
 * Column component which can be used when the user doesn't need to define
 * a complex template, and a simple transformation function (from data object
 * to string) suffices.
 */
var FunctionColumnComponent = (function () {
    function FunctionColumnComponent() {
    }
    FunctionColumnComponent.prototype.setData = function (data) {
        this.dataInternal = data;
    };
    Object.defineProperty(FunctionColumnComponent.prototype, "transformFunction", {
        set: function (func) {
            this.func = func;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FunctionColumnComponent.prototype, "data", {
        get: function () {
            return String(this.func(this.dataInternal));
        },
        enumerable: true,
        configurable: true
    });
    FunctionColumnComponent = __decorate([
        core_1.Component({ template: "{{data}}" }), 
        __metadata('design:paramtypes', [])
    ], FunctionColumnComponent);
    return FunctionColumnComponent;
}());
exports.FunctionColumnComponent = FunctionColumnComponent;
function isComponentColumn(column) {
    return column.component != undefined;
}
function isFunctionColumn(column) {
    return column.func != undefined;
}
/**
 * Directive used to define insert points for table cells.
 */
var DataTableCellInsertPoint = (function () {
    function DataTableCellInsertPoint(viewContainerRef) {
        this.viewContainerRef = viewContainerRef;
    }
    DataTableCellInsertPoint = __decorate([
        core_1.Directive({ selector: '[data-table-cell-insert-point]' }), 
        __metadata('design:paramtypes', [core_1.ViewContainerRef])
    ], DataTableCellInsertPoint);
    return DataTableCellInsertPoint;
}());
exports.DataTableCellInsertPoint = DataTableCellInsertPoint;
var TableComponent = (function () {
    function TableComponent(changeDetector, factoryResolver, injector) {
        this.changeDetector = changeDetector;
        this.factoryResolver = factoryResolver;
        this.injector = injector;
        // Ideally, there would be a class-level generic type for the type of the data
        // contained in the table. This would make sure that the columns are always
        // compatible with the inserted data. However, Angular2's AOT compiler does not
        // support generic types in components (and no support seems to be planned). So
        // we need to define these as 'any'. If support is included in the future, simply
        // adding the generic <T> to the class and removing it from all methods would allow
        // changing all these 'any' to 'T' so the table is properly typed.
        this.title = "";
        this.selectionChange = new core_1.EventEmitter();
        /**
         * Number of rows to show in each page.
         */
        this.pageSize = 5;
        /**
         * Filter strings. This is an array of strings, each of which corresponds, by
         * position, to a search string in each of the columns.
         */
        this.filters = [];
        /**
         * Current page rendered in the table. This is a 0-indexed internal
         * representation.
         */
        this.page = 0;
        /**
         * Row indexes which are currently selected. The row index corresponds
         * to the position of the data object in the original input data array
         * (this.data).
         */
        this.selectionSet = new Set();
        /**
         * Column currently used to sort the table.
         */
        this.sortingColumn = 0;
        /**
         * Whether sorting is ascending or descending.
         */
        this.descending = false;
        /**
         * Internal representation of input data. Contains the already
         * processed cell transformations corresponding to the column
         * configuration, to allow sorting and filtering based on the
         * final rendered cells. Sorting of processedData is done in-place.
         */
        this.processedData = [];
        /**
         * Set of rows in processedData which pass the current filtering
         * settings. This is kept in its own member so changes in paging
         * don't require re-filtering all the rows, and so changes in
         * filtering don't require re-sorting all the rows.
         */
        this.filteredData = [];
        /**
         * Set of rows which are currently visible in the table.
         */
        this.pVisibleRows = [];
        /**
         * Whether the table data is currently being asynchronously loaded.
         */
        this.pLoading = false;
    }
    Object.defineProperty(TableComponent.prototype, "visibleRows", {
        get: function () { return this.pVisibleRows; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TableComponent.prototype, "loading", {
        get: function () { return this.pLoading; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TableComponent.prototype, "numberOfPages", {
        get: function () { return Math.ceil(this.filteredData.length / this.pageSize); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TableComponent.prototype, "visiblePage", {
        /** Public 1-based representation of the current page. */
        get: function () { return this.page + 1; },
        /** Public 1-based representation of the current page. */
        set: function (visiblePage) {
            if (visiblePage < 1 || visiblePage > this.numberOfPages)
                return;
            this.page = visiblePage - 1;
        },
        enumerable: true,
        configurable: true
    });
    TableComponent.prototype.ngAfterViewInit = function () {
        if (this.columns && this.data) {
            this.setData({ columns: this.columns, data: this.data });
        }
    };
    TableComponent.prototype.ngOnChanges = function () {
        if (this.columns && this.data) {
            this.setData({ columns: this.columns, data: this.data });
        }
    };
    /**
     * Sets the data and the column configuration in the table. Since
     * components with generics are not supported by Angular, using
     * this function instead of using binding to @Input members makes
     * sure that the column configuration is compatible with the data.
     */
    TableComponent.prototype.setData = function (_a) {
        var columns = _a.columns, data = _a.data;
        this.pLoading = false;
        this.data = data;
        this.columns = columns;
        this.filters = Array(columns.length).fill('');
        console.profile("fun1");
        this.processedData = this.processData1(data, columns);
        console.profileEnd();
        console.profile("fun2");
        this.processData2(data, columns);
        console.profileEnd();
        console.profile("fun3");
        this.processData3(data, columns);
        console.profileEnd();
        this.selectionSet.clear();
        this.updateSortingFilteringAndPaging();
    };
    /**
     * Async version of {@see setData}.
     */
    TableComponent.prototype.setDataAsync = function (_a) {
        var _this = this;
        var columns = _a.columns, promise = _a.promise;
        this.pLoading = true;
        promise.then(function (data) { return _this.setData({ columns: columns, data: data }); });
    };
    /**
     * Whether the given row key is selected.
     */
    TableComponent.prototype.isSelected = function (rowKey) {
        return this.selectionSet.has(rowKey);
    };
    /**
     * Register a change in the selection status for a given row key.
     */
    TableComponent.prototype.handleSelection = function (rowKey) {
        this.isSelected(rowKey) ? this.selectionSet.delete(rowKey) : this.selectionSet.add(rowKey);
        this.selectionChange.emit({
            selectedKeys: new Set(this.selectionSet),
            changedKey: rowKey,
            newValue: this.isSelected(rowKey),
        });
    };
    /**
     * Sets the sorting column and updates the view.
     */
    TableComponent.prototype.setSortingColumn = function (index) {
        this.descending = this.sortingColumn === index ? !this.descending : false;
        this.sortingColumn = index;
        this.updateSortingFilteringAndPaging();
    };
    TableComponent.prototype.isSortedByColumn = function (index) {
        return this.sortingColumn === index;
    };
    /**
     * Triggers a view update to reflect new filter values.
     */
    TableComponent.prototype.handleFilterChanges = function () {
        this.page = 0;
        this.updateFilteringAndPaging();
    };
    /**
     * Triggers a view update to reflect new paging settings.
     */
    TableComponent.prototype.handlePagingChanges = function () {
        this.updatePaging();
    };
    /**
     * Updates the view. Applies sorting, filtering and paging settings.
     */
    TableComponent.prototype.updateSortingFilteringAndPaging = function () {
        TableComponent.sortData(this.processedData, this.sortingColumn, this.descending, this.columns[this.sortingColumn].numeric);
        this.updateFilteringAndPaging();
    };
    /**
     * Updates the view. Applies filtering and paging settings, but maintains previously
     * existing sorting.
     */
    TableComponent.prototype.updateFilteringAndPaging = function () {
        this.filteredData = TableComponent.filterData(this.processedData, this.filters);
        this.updatePaging();
    };
    /**
     * Updates the view. Applies paging settings, but maintains previously existing
     * filtering and sorting settings.
     */
    TableComponent.prototype.updatePaging = function () {
        this.paint(TableComponent.pageData(this.filteredData, this.page, this.pageSize));
    };
    /**
     * Processes input data. Generates an internal representation of all the
     * potential table rows, so we can perform sorting and filtering operations on
     * the future content.
     */
    TableComponent.prototype.processData1 = function (data, columns) {
        var element = document.createElement('DIV');
        var processedData = [];
        var rowKey = 0;
        for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
            var datum = data_1[_i];
            var row = {
                textContent: [],
                key: rowKey++,
                data: datum
            };
            for (var _a = 0, columns_1 = columns; _a < columns_1.length; _a++) {
                var column = columns_1[_a];
                if (isComponentColumn(column)) {
                    var factory = this.factoryResolver.resolveComponentFactory(column.component);
                    var componentRef = factory.create(this.injector, null, element);
                    componentRef.instance.setData(datum);
                    componentRef.changeDetectorRef.detectChanges();
                    row.textContent.push(element.textContent);
                    componentRef.destroy();
                }
                else if (isFunctionColumn(column)) {
                    row.textContent.push(String(column.func(datum)));
                }
                else {
                    throw new Error('Assertion error: Unexpected column object.');
                }
            }
            processedData.push(row);
        }
        return processedData;
    };
    TableComponent.prototype.processData3 = function (data, columns) {
        var processedData = [];
        var rowKey = 0;
        var genFunctions = [];
        var componentRefs = new Map();
        var element = document.createElement('DIV');
        for (var _i = 0, columns_2 = columns; _i < columns_2.length; _i++) {
            var column = columns_2[_i];
            if (isComponentColumn(column)) {
                var factory = this.factoryResolver.resolveComponentFactory(column.component);
                var componentRef = factory.create(this.injector, null, element);
                componentRefs.set(column, componentRef);
            }
        }
        for (var _a = 0, data_2 = data; _a < data_2.length; _a++) {
            var datum = data_2[_a];
            var row = {
                textContent: [],
                key: rowKey++,
                data: datum
            };
            for (var _b = 0, columns_3 = columns; _b < columns_3.length; _b++) {
                var column = columns_3[_b];
                if (isComponentColumn(column)) {
                    var cRef = componentRefs.get(column);
                    cRef.instance.setData(datum);
                    cRef.changeDetectorRef.detectChanges();
                    row.textContent.push(element.textContent);
                }
                else if (isFunctionColumn(column)) {
                    row.textContent.push(String(column.func(datum)));
                }
                else {
                    throw new Error('Assertion error: Unexpected column object.');
                }
            }
            processedData.push(row);
        }
        //componentRefs.forEach((ref) => ref.destroy());
        return processedData;
    };
    TableComponent.prototype.processData2 = function (data, columns) {
        var processedData = [];
        var rowKey = 0;
        var genFunctions = [];
        var componentRefs = [];
        var _loop_1 = function(column) {
            if (isComponentColumn(column)) {
                var factory = this_1.factoryResolver.resolveComponentFactory(column.component);
                var element_1 = document.createElement('DIV');
                var componentRef_1 = factory.create(this_1.injector, null, element_1);
                componentRefs.push(componentRef_1);
                var genFunction = function (data) {
                    componentRef_1.instance.setData(data);
                    componentRef_1.changeDetectorRef.detectChanges();
                    return element_1.textContent;
                };
                genFunctions.push(genFunction);
            }
            else if (isFunctionColumn(column)) {
                var func_1 = column.func;
                genFunctions.push(function (data) { return String(func_1(data)); });
            }
            else {
                throw new Error('Assertion error: Unexpected column object.');
            }
        };
        var this_1 = this;
        for (var _i = 0, columns_4 = columns; _i < columns_4.length; _i++) {
            var column = columns_4[_i];
            _loop_1(column);
        }
        var _loop_2 = function(datum) {
            var row = {
                textContent: genFunctions.map(function (func) { return func(datum); }),
                key: rowKey++,
                data: datum
            };
            processedData.push(row);
        };
        for (var _a = 0, data_3 = data; _a < data_3.length; _a++) {
            var datum = data_3[_a];
            _loop_2(datum);
        }
        componentRefs.forEach(function (ref) { return ref.destroy(); });
        return processedData;
    };
    /**
     * Paints the given rows into the table view.
     */
    TableComponent.prototype.paint = function (rows) {
        this.pVisibleRows = rows;
        this.changeDetector.detectChanges();
        var insertPoints = this.insertPoints.toArray();
        insertPoints.forEach(function (insertPoint) { return insertPoint.viewContainerRef.clear(); });
        var cellIndex = 0;
        for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
            var row = rows_1[_i];
            for (var _a = 0, _b = this.columns; _a < _b.length; _a++) {
                var column = _b[_a];
                var insertPoint = insertPoints[cellIndex];
                var ref = void 0;
                if (isComponentColumn(column)) {
                    var factory = this.factoryResolver.resolveComponentFactory(column.component);
                    var compRef = insertPoint.viewContainerRef.createComponent(factory);
                    compRef.instance.setData(row.data);
                    ref = compRef;
                }
                else if (isFunctionColumn(column)) {
                    var factory = this.factoryResolver.resolveComponentFactory(FunctionColumnComponent);
                    var compRef = insertPoint.viewContainerRef.createComponent(factory);
                    compRef.instance.transformFunction = column.func;
                    compRef.instance.setData(row.data);
                    ref = compRef;
                }
                else {
                    throw new Error('Assertion error: Unexpected column object.');
                }
                ref.changeDetectorRef.detectChanges();
                ref.changeDetectorRef.detach();
                cellIndex++;
            }
        }
    };
    /**
     * Filters a list of rows based on a list of search strings.
     */
    TableComponent.filterData = function (rows, filters) {
        var res = filters.map(function (search) { return search ? new RegExp(search) : null; });
        return rows.filter(function (row) {
            var failPredicate = function (re, i) {
                return re != null && !re.test(row.textContent[i]);
            };
            return !res.some(failPredicate);
        });
    };
    /**
     * Pages a list of rows, based on passed paging settings.
     */
    TableComponent.pageData = function (rows, page, pageSize) {
        var offset = page * pageSize;
        var last = (page + 1) * pageSize;
        return rows.slice(offset, last);
    };
    /**
     * Sorts a list of rows.
     * @param rows The list of rows to sort.
     * @param i The column by which to sort the rows.
     * @param descending Whether to sort ascending or descending.
     * @param numeric Whether the cell content should be treated as a number for sorting.
     *     The first number in the cell will be extracted and used for sorting.
     */
    TableComponent.sortData = function (rows, i, descending, numeric) {
        if (numeric === void 0) { numeric = false; }
        var compareFunction = function (a, b) {
            var val1;
            var val2;
            if (numeric) {
                val1 = parseInt(a.textContent[i], 10);
                val2 = parseInt(b.textContent[i], 10);
            }
            else {
                val1 = a.textContent[i];
                val2 = b.textContent[i];
            }
            var multiplier = descending ? -1 : 1;
            return (val1 > val2) ? multiplier : -multiplier;
        };
        rows.sort(compareFunction);
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], TableComponent.prototype, "title", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Array)
    ], TableComponent.prototype, "data", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Array)
    ], TableComponent.prototype, "columns", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Boolean)
    ], TableComponent.prototype, "selectable", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], TableComponent.prototype, "selectionChange", void 0);
    __decorate([
        core_1.ViewChildren(DataTableCellInsertPoint), 
        __metadata('design:type', core_1.QueryList)
    ], TableComponent.prototype, "insertPoints", void 0);
    TableComponent = __decorate([
        core_1.Component({
            selector: 'data-table',
            styles: ["\n    * {\n      font-family: sans-serif;\n    }\n    input {\n      border: 1px solid #ccc;\n    }\n    table {\n      border-collapse: collapse;\n      width: 100%;\n    }\n    td, th {\n      font-size: .9em;\n      border-top: 1px solid grey;\n      border-bottom: 1px solid grey;\n    }\n    .cell {\n      padding: 10px;\n    }\n    .cell >>> ul {\n      margin: 0;\n      padding: 0;\n    }\n    .wrapper {\n      border: 1px solid grey;\n      display: inline-block;\n    }\n    .filter {\n      width: 100px;\n    }\n    .pager {\n      width: 40px;\n    }\n  "],
            template: "\n  <div><div class=\"wrapper\">\n  <h1>{{title}}</h1>\n  <table>\n    <tr>\n      <th *ngIf=\"selectable\"></th>\n      <th *ngFor=\"let column of columns; let i = index\" (click)=\"setSortingColumn(i)\">\n          <span *ngIf=\"isSortedByColumn(i)\" [textContent]=\"descending ? '\u25BC' : '\u25B2'\"></span>{{column.title}}\n      </th>\n    </tr>\n    <tr>\n      <td *ngIf=\"selectable\"></td>\n      <td *ngFor=\"let column of columns; let i = index\">\n        <input class=\"filter\" [(ngModel)]=\"filters[i]\" (ngModelChange)=\"handleFilterChanges()\">\n      </td>\n    </tr>\n    <tr *ngFor=\"let row of visibleRows\">\n      <td *ngIf=\"selectable\">\n        <input type=\"checkbox\" [checked]=\"isSelected(row.key)\" (change)=\"handleSelection(row.key)\">\n      </td>\n      <td *ngFor=\"let column of columns\">\n        <div class=\"cell\">\n          <template data-table-cell-insert-point></template>\n        </div>\n      </td>\n    </tr>\n  </table>\n  <input class=\"pager\" [(ngModel)]=\"pageSize\" (ngModelChange)=\"handlePagingChanges()\" type=\"number\">\n  rows per page |\n  <input class=\"pager\" [(ngModel)]=\"visiblePage\" (ngModelChange)=\"handlePagingChanges()\" type=\"number\">\n  of {{numberOfPages}} pages\n  </div></div>\n  ",
        }), 
        __metadata('design:paramtypes', [core_1.ChangeDetectorRef, core_1.ComponentFactoryResolver, core_1.Injector])
    ], TableComponent);
    return TableComponent;
}());
exports.TableComponent = TableComponent;
//# sourceMappingURL=table.component.js.map