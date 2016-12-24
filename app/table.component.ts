import {
  Component,
  Input,
  ViewContainerRef,
  Directive,
  Type,
  ViewChildren,
  Injector,
  ComponentFactory,
  ComponentRef,
  ComponentFactoryResolver,
  QueryList,
  ChangeDetectorRef,
  Output,
  EventEmitter,
} from '@angular/core';

/**
 * Common interface that any custom column component should implement.
 * Generally users will extend BasicColumnComponent rather than
 * implementing this interface manually.
 */
export interface ColumnComponent<T> {
  setData(data: T): void;
}

/**
 * Base class for custom column components. It provides the basic boilerplate
 * needed for a component which exports the contained data from the "data"
 * property.
 */
export abstract class BasicColumnComponent<T> implements ColumnComponent<T> {
  data: T;

  setData(data: T) {
    this.data = data;
  }
}

/**
 * Column component which can be used when the user doesn't need to define
 * a complex template, and a simple transformation function (from data object
 * to string) suffices.
 */
@Component({ template: `{{data}}` })
export class FunctionColumnComponent implements ColumnComponent<any> {
  private dataInternal: any;
  private func: (data: any) => string | number | boolean;

  setData(data: any) {
    this.dataInternal = data;
  }

  set transformFunction(func: (data: any) => string | number | boolean) {
    this.func = func;
  }

  get data(): string {
    return String(this.func(this.dataInternal));
  }
}

/**
 * A column definition object. The content of the cells in this column will be
 * rendered using the template defined in an Angular component.
 */
interface ComponentColumn<T> {
  component: Type<ColumnComponent<T>>;
  title: string;
  /** Whether the contents of this column must be sorted numerically instead of alphabetically. */
  numeric?: boolean;
}

/**
 * A column definition object. The content of the cells in this column will be
 * rendered simply by applying a transformation function to the input data.
 */
interface FunctionColumn<T> {
  func: (data: T) => string | number | boolean;
  title: string;
  /** Whether the contents of this column must be sorted numerically instead of alphabetically. */
  numeric?: boolean;
}

type Column<T> = FunctionColumn<T> | ComponentColumn<T>;

function isComponentColumn<T>(column: Column<T>): column is ComponentColumn<T> {
  return (<ComponentColumn<T>>column).component != undefined;
}

function isFunctionColumn<T>(column: Column<T>): column is FunctionColumn<T> {
  return (<FunctionColumn<T>>column).func != undefined;
}

/**
 * Event which will be emitted when the selected table rows change.
 */
export interface SelectionEvent {
  /**
   * The set of selected data keys. The keys correspond to the index of the data object
   * in the original data array.
   */
  selectedKeys: Set<number>;
  /**
   * The key whose selection status has been changed in this event.
   */
  changedKey: number;
  /**
   * The new value for the key changed in this event.
   */
  newValue: boolean;
}

interface Row<T> {
  textContent: string[];
  data: T;
  key: number;
}

/**
 * Directive used to define insert points for table cells.
 */
@Directive({ selector: '[data-table-cell-insert-point]' })
export class DataTableCellInsertPoint {
  constructor(public viewContainerRef: ViewContainerRef) { }
}


@Component({
  selector: 'data-table',
  styles: [`
    * {
      font-family: sans-serif;
    }
    input {
      border: 1px solid #ccc;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td, th {
      font-size: .9em;
      border-top: 1px solid grey;
      border-bottom: 1px solid grey;
    }
    .cell {
      padding: 10px;
    }
    .cell >>> ul {
      margin: 0;
      padding: 0;
    }
    .wrapper {
      border: 1px solid grey;
      display: inline-block;
    }
    .filter {
      width: 100px;
    }
    .pager {
      width: 40px;
    }
  `],
  template: `
  <div><div class="wrapper">
  <h1>{{title}}</h1>
  <table>
    <tr>
      <th *ngIf="selectable"></th>
      <th *ngFor="let column of columns; let i = index" (click)="setSortingColumn(i)">
          <span *ngIf="isSortedByColumn(i)" [textContent]="descending ? '▼' : '▲'"></span>{{column.title}}
      </th>
    </tr>
    <tr>
      <td *ngIf="selectable"></td>
      <td *ngFor="let column of columns; let i = index">
        <input class="filter" [(ngModel)]="filters[i]" (ngModelChange)="handleFilterChanges()">
      </td>
    </tr>
    <tr *ngFor="let row of visibleRows">
      <td *ngIf="selectable">
        <input type="checkbox" [checked]="isSelected(row.key)" (change)="handleSelection(row.key)">
      </td>
      <td *ngFor="let column of columns">
        <div class="cell">
          <template data-table-cell-insert-point></template>
        </div>
      </td>
    </tr>
  </table>
  <input class="pager" [(ngModel)]="pageSize" (ngModelChange)="handlePagingChanges()" type="number">
  rows per page |
  <input class="pager" [(ngModel)]="visiblePage" (ngModelChange)="handlePagingChanges()" type="number">
  of {{numberOfPages}} pages
  </div></div>
  `,
})
export class TableComponent {
  // Ideally, there would be a class-level generic type for the type of the data
  // contained in the table. This would make sure that the columns are always
  // compatible with the inserted data. However, Angular2's AOT compiler does not
  // support generic types in components (and no support seems to be planned). So
  // we need to define these as 'any'. If support is included in the future, simply
  // adding the generic <T> to the class and removing it from all methods would allow
  // changing all these 'any' to 'T' so the table is properly typed.

  @Input() title: string = "";

  /** 
   * The data to render in the table as a list of objects. Each object corresponds
   * to a row in the table, and each cell in the row will be rendered by applying
   * a transformation to said object (which is defined by the column configuration).
   * For better type-checks, it can be set via the setData and setDataAsync methods.
   */
  @Input() data: any[];

  /** 
   * The column configuration for the table. Columns can be of two types: ComponentColumn
   * or FunctionColumn. ComponentColumns contain an Angular template which will be
   * rendered using the data object. FunctionColumns simply define a transformation function
   * which will return the cell content when applied to the data object.
   */
  @Input() columns: Column<any>[];

  /**
   * Whether the rows of the table are selectable.
   */
  @Input() selectable: boolean;

  @Output() selectionChange = new EventEmitter<SelectionEvent>();

  @ViewChildren(DataTableCellInsertPoint) insertPoints: QueryList<DataTableCellInsertPoint>;

  /**
   * Number of rows to show in each page.
   */
  pageSize: number = 5;

  /**
   * Filter strings. This is an array of strings, each of which corresponds, by
   * position, to a search string in each of the columns.
   */
  filters: string[] = [];

  /** 
   * Current page rendered in the table. This is a 0-indexed internal
   * representation.
   */
  private page: number = 0;

  /**
   * Row indexes which are currently selected. The row index corresponds
   * to the position of the data object in the original input data array
   * (this.data).
   */
  private selectionSet = new Set<number>();

  /**
   * Column currently used to sort the table.
   */
  private sortingColumn = 0;

  /** 
   * Whether sorting is ascending or descending.
   */
  private descending = false;

  /**
   * Internal representation of input data. Contains the already
   * processed cell transformations corresponding to the column
   * configuration, to allow sorting and filtering based on the
   * final rendered cells. Sorting of processedData is done in-place.
   */
  private processedData: Row<any>[] = [];

  /**
   * Set of rows in processedData which pass the current filtering
   * settings. This is kept in its own member so changes in paging
   * don't require re-filtering all the rows, and so changes in
   * filtering don't require re-sorting all the rows.
   */
  private filteredData: Row<any>[] = [];

  /**
   * Set of rows which are currently visible in the table.
   */
  private pVisibleRows: Row<any>[] = [];

  /**
   * Whether the table data is currently being asynchronously loaded.
   */
  private pLoading: boolean = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private factoryResolver: ComponentFactoryResolver,
    private injector: Injector) { }

  get visibleRows() : Row<any>[] { return this.pVisibleRows; }

  get loading() { return this.pLoading; }

  get numberOfPages() { return Math.ceil(this.filteredData.length / this.pageSize); }

  /** Public 1-based representation of the current page. */
  get visiblePage() { return this.page + 1; }

  /** Public 1-based representation of the current page. */
  set visiblePage(visiblePage: number) {
    if (visiblePage < 1 || visiblePage > this.numberOfPages) return;
    this.page = visiblePage - 1;
  }

  ngAfterViewInit() {
    if (this.columns && this.data) {
      this.setData({ columns: this.columns, data: this.data });
    }
  }

  ngOnChanges() {
    if (this.columns && this.data) {
      this.setData({ columns: this.columns, data: this.data });
    }
  }

  /**
   * Sets the data and the column configuration in the table. Since
   * components with generics are not supported by Angular, using
   * this function instead of using binding to @Input members makes
   * sure that the column configuration is compatible with the data.
   */
  setData<T>({columns, data}: { columns: Column<T>[], data: T[] }) {
    this.pLoading = false;
    this.data = data;
    this.columns = columns;
    this.filters = Array(columns.length).fill('');
    this.processedData = this.processData(data, columns);
    this.selectionSet.clear();
    this.updateSortingFilteringAndPaging();

  }

  /**
   * Async version of {@see setData}.
   */
  setDataAsync<T>({columns, promise}: { columns: Column<T>[], promise: Promise<T[]> }) {
    this.pLoading = true;
    promise.then((data) => this.setData({ columns, data }));
  }

  /**
   * Whether the given row key is selected.
   */
  isSelected(rowKey: number) {
    return this.selectionSet.has(rowKey);
  }

  /**
   * Register a change in the selection status for a given row key.
   */
  handleSelection(rowKey: number) {
    this.isSelected(rowKey) ? this.selectionSet.delete(rowKey) : this.selectionSet.add(rowKey);
    this.selectionChange.emit({
      selectedKeys: new Set(this.selectionSet),
      changedKey: rowKey,
      newValue: this.isSelected(rowKey),
    })
  }

  /**
   * Sets the sorting column and updates the view.
   */
  setSortingColumn(index: number) {
    this.descending = this.sortingColumn === index ? !this.descending : false;
    this.sortingColumn = index;
    this.updateSortingFilteringAndPaging();
  }

  isSortedByColumn(index: number) {
    return this.sortingColumn === index;
  }

  /**
   * Triggers a view update to reflect new filter values.
   */
  handleFilterChanges() {
    this.page = 0;
    this.updateFilteringAndPaging();
  }

  /**
   * Triggers a view update to reflect new paging settings.
   */
  handlePagingChanges() {
    this.updatePaging();
  }

  /**
   * Updates the view. Applies sorting, filtering and paging settings.
   */
  private updateSortingFilteringAndPaging() {
    TableComponent.sortData(this.processedData, this.sortingColumn, this.descending, this.columns[this.sortingColumn].numeric);
    this.updateFilteringAndPaging();
  }

  /**
   * Updates the view. Applies filtering and paging settings, but maintains previously
   * existing sorting.
   */
  private updateFilteringAndPaging() {
    this.filteredData = TableComponent.filterData(this.processedData, this.filters);
    this.updatePaging();
  }

  /**
   * Updates the view. Applies paging settings, but maintains previously existing
   * filtering and sorting settings.
   */
  private updatePaging() {
    this.paint(TableComponent.pageData(this.filteredData, this.page, this.pageSize));
  }


  /**
   * Processes input data. Generates an internal representation of all the
   * potential table rows, so we can perform sorting and filtering operations on
   * the future content.
   */
  private processData<T>(data: T[], columns: Column<T>[]): Row<T>[] {
    const processedData: Row<T>[] = [];
    let rowKey = 0;
    const genFunctions = [];
    const componentRefs: ComponentRef<ColumnComponent<T>>[] = [];
    for (let column of columns) {
      if (isComponentColumn(column)) {
        const factory = this.factoryResolver.resolveComponentFactory(column.component);
        const element = document.createElement('DIV');
        const componentRef = factory.create(this.injector, null, element);
        componentRefs.push(componentRef);
        const genFunction = (data: T) => {
          componentRef.instance.setData(data);
          componentRef.changeDetectorRef.detectChanges();
          return element.textContent;
        }
        genFunctions.push(genFunction);
      } else if (isFunctionColumn(column)) {
        const func = column.func;
        genFunctions.push((data: T) => String(func(data)));
      } else {
        throw new Error('Assertion error: Unexpected column object.');
      }
    }
    for (let datum of data) {
      const row: Row<T> = {
        textContent: genFunctions.map((func) => func(datum)),
        key: rowKey++,
        data: datum
      };
      processedData.push(row);
    }
    componentRefs.forEach((ref) => ref.destroy());
    return processedData;
  }

  /**
   * Paints the given rows into the table view.
   */
  private paint<T>(rows: Row<T>[]) {
    this.pVisibleRows = rows;
    this.changeDetector.detectChanges();
    const insertPoints = this.insertPoints.toArray();
    insertPoints.forEach((insertPoint) => insertPoint.viewContainerRef.clear());

    let cellIndex = 0;
    for (let row of rows) {
      for (let column of this.columns) {
        const insertPoint = insertPoints[cellIndex];
        let ref: ComponentRef<ColumnComponent<T> | FunctionColumnComponent>;
        if (isComponentColumn(column)) {
          const factory = this.factoryResolver.resolveComponentFactory(column.component);
          const compRef = insertPoint.viewContainerRef.createComponent(factory);
          compRef.instance.setData(row.data);
          ref = compRef;
        } else if (isFunctionColumn(column)) {
          const factory = this.factoryResolver.resolveComponentFactory(FunctionColumnComponent);
          const compRef = insertPoint.viewContainerRef.createComponent(factory);
          compRef.instance.transformFunction = column.func;
          compRef.instance.setData(row.data);
          ref = compRef;
        } else {
          throw new Error('Assertion error: Unexpected column object.');
        }
        ref.changeDetectorRef.detectChanges();
        ref.changeDetectorRef.detach();
        cellIndex++;
      }
    }
  }

  /**
   * Filters a list of rows based on a list of search strings.
   */
  private static filterData<T>(rows: Row<T>[], filters: string[]): Row<T>[] {
    const res = filters.map((search) => search ? new RegExp(search) : null);
    return rows.filter((row: Row<T>) => {
      const failPredicate = (re: RegExp, i: number) => {
        return re != null && !re.test(row.textContent[i]);
      };
      return !res.some(failPredicate);
    });
  }

  /**
   * Pages a list of rows, based on passed paging settings.
   */
  private static pageData<T>(rows: Row<T>[], page: number, pageSize: number): Row<T>[] {
    const offset = page * pageSize;
    const last = (page + 1) * pageSize;
    return rows.slice(offset, last);
  }

  /**
   * Sorts a list of rows.
   * @param rows The list of rows to sort.
   * @param i The column by which to sort the rows.
   * @param descending Whether to sort ascending or descending.
   * @param numeric Whether the cell content should be treated as a number for sorting.
   *     The first number in the cell will be extracted and used for sorting.
   */
  private static sortData<T>(rows: Row<T>[], i: number, descending: boolean, numeric: boolean = false) {
    const compareFunction = (a: Row<T>, b: Row<T>) => {
      let val1: number | string;
      let val2: number | string;
      if (numeric) {
        val1 = parseInt(a.textContent[i], 10);
        val2 = parseInt(b.textContent[i], 10);
      } else {
        val1 = a.textContent[i];
        val2 = b.textContent[i];
      }
      const multiplier = descending ? -1 : 1;
      return (val1 > val2) ? multiplier : -multiplier;
    };
    rows.sort(compareFunction);
  }
}
