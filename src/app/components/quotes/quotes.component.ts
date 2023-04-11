import { Component, OnInit } from "@angular/core";
import { QuoteService } from "./service/quote.service";
import { QuoteModel } from "./model/quote.model";

@Component({
  selector: "app-quotes",
  templateUrl: "./quotes.component.html",
  styleUrls: ["./quotes.component.css"]
})
export class QuotesComponent implements OnInit {
  public quoteList: QuoteModel[] = [];
  public fetchedList: QuoteModel[] = [];
  public quoteText: string = "";

  constructor(private service: QuoteService) {}

  ngOnInit() {
    this.quoteList = this.service.getQuote();
    this.service.fetchQuotesFromServer().then((data:QuoteModel[]) => {
      this.fetchedList = data;
    });
  }

  createNewQuote() {
    this.service.addNewQuote(this.quoteText);
    this.quoteText = "";
  }

  removeQuote(index:number) {
    this.service.removeQuote(index);
  }
}