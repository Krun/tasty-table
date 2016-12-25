import { Component, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { ColumnComponent, TableComponent, TableModel, SelectionEvent } from './table.component';

type DataType = {
  userId: number,
  userName: string,
  serviceIds: number[],
};

/**
 * Extending BasicColumnComponent lets you define a simple template
 * that exports the data object in its 'data' member;
 */
@Component({ template: 'ID: {{data.userId}}' })
export class Column1 extends ColumnComponent<DataType> { }

/**
 * Columns can have complex templates to represent any kind of data type.
 */
@Component({ template: '<ul><li *ngFor="let id of data.serviceIds">Service {{id}}</li></ul>' })
export class Column2 extends ColumnComponent<DataType> { }

/**
 * Columns can define any kind of data transformations.
 */
@Component({ template: '<p>{{paddedId}}</p>' })
export class Column3 implements ColumnComponent<DataType> {
  data: DataType;

  get paddedId() {
    const id = String(this.data.userId);
    const pad = "000000";
    return pad.substring(0, pad.length - id.length) + id;
  }
}

@Component({
  selector: 'my-app',
  styles: ['* {font-family: sans-serif;}'],
  template: `
    <h1>Responsive Data Tables</h1>
    Number of data rows: <input [(ngModel)]="numberOfRows" type="number"><button (click)="updateData()">update</button>
    <label> With checkboxes <input type="checkbox" [(ngModel)]="selectable"></label>
    <data-table title="Some data" [model]="tableModel" [selectable]="selectable" (selectionChange)="tableSelect($event)"></data-table>
    <h2>Selection events</h2>
    <p><b>Selected keys:</b> <span *ngFor="let key of selectedKeys">{{key}},</span></p>
    <ul>
    <li *ngFor="let event of selectionEvents">{{event}}</li>
    </ul>
  `,
})
export class AppComponent {
  selectable = true;
  numberOfRows = 5000;
  selectedKeys: number[] = [];
  selectionEvents: string[] = [];
  tableModel: TableModel<DataType> = {
    columns: [
      // With numeric = true the column will be sorted numerically even if it contains strings
      { title: "User ID", component: Column1, numeric: true },
      { title: "Services", component: Column2 },
      { title: "Padded ID", component: Column3 },
      // For simple data types, instead of a template component we can simply define
      // a function which will yield the cell content.
      // This is way more efficient, by the way!
      { title: "Password", func: (x: DataType) => x.userName },
      // If a function extracts a number, sorting will be automatically numeric.
      { title: "Raw ID", func: (x: DataType) => x.userId },
      // A lot of things can be done with simple functions
      { title: "Even ID?", func: (x: DataType) => Boolean(x.userId % 2) }
    ],
    data: generateRandomData(this.numberOfRows),
  };

  constructor(private changeDetector: ChangeDetectorRef) { }

  tableSelect(event: SelectionEvent) {
    this.selectedKeys = Array.from(event.selectedKeys.values());
    this.selectionEvents.push(String(event.changedKey) + ' has been ' + (event.newValue ? 'selected' : 'unselected'));
  }

  updateData() {
    this.tableModel.data = generateRandomData(this.numberOfRows);
    this.changeDetector.detectChanges();
  }

}

function randomString() {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(5)
    .fill(0)
    .map((x) => Math.floor(Math.random() * possible.length))
    .map((x) => possible.charAt(x))
    .join('');
}

function generateRandomData(length: number) {
  console.time('Generating random data');
  const r = Array(length)
    .fill(0)
    .map((_, i) => ({
      userId: i,
      userName: randomString(),
      serviceIds: [500 + i, i + i]
    }));
  console.timeEnd('Generating random data');
  return r;
}