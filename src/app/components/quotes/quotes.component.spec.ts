import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { QuotesComponent } from "./quotes.component";
import { QuoteService } from "./service/quote.service";
import { QuoteModel } from "./model/quote.model";
import { FormsModule } from "@angular/forms";

import { PanelModule } from 'primeng/panel';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


describe("QuotesComponent", () => {
    let component: QuotesComponent;
    let fixture: ComponentFixture<QuotesComponent>;
  
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [FormsModule,PanelModule,InputTextareaModule,ButtonModule,BrowserAnimationsModule],
        declarations: [QuotesComponent]
      });
    });
  
    beforeEach(() => {
      fixture = TestBed.createComponent(QuotesComponent);
      component = fixture.debugElement.componentInstance;
    });
  
    it("should create Quote component", () => {
      expect(component).toBeTruthy();
    });
  
    it("should use the quoteList from the service", () => {
      const quoteService = fixture.debugElement.injector.get(QuoteService);
      fixture.detectChanges();
      expect(quoteService.getQuote()).toEqual(component.quoteList);
    });
  
    it("should create a new post", () => {
      component.quoteText = "I love this test";
      fixture.detectChanges();
      const compiled = fixture.debugElement.nativeElement;
      expect(compiled.innerHTML).toContain("I love this test");
    });
  
    it("should disable the button when textArea is empty", () => {
      fixture.detectChanges();
      const button = fixture.debugElement.query(By.css("button"));
      expect(button.nativeElement.disabled).toBeTruthy();
    });
  
    it("should enable button when textArea is not empty", () => {
      component.quoteText = "I love this test";
      fixture.detectChanges();
      const button = fixture.debugElement.query(By.css("button"));
      expect(button.nativeElement.disabled).toBeFalsy();
    });
  
    it("should fetch data asynchronously", async () => {
      const fakedFetchedList = [
        new QuoteModel("I love unit testing", "Mon 4, 2018")
      ];
      const quoteService = fixture.debugElement.injector.get(QuoteService);
      let spy = spyOn(quoteService, "fetchQuotesFromServer").and.returnValue(
        Promise.resolve(fakedFetchedList)
      );
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(component.fetchedList).toBe(fakedFetchedList);
      });
    });
  });