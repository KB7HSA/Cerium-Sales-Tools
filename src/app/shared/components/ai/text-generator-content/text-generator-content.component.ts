
import { Component } from '@angular/core';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-text-generator-content',
  imports: [
    CopyButtonComponent
],
  templateUrl: './text-generator-content.component.html',
  styles: ``,
})
export class TextGeneratorContentComponent {

   firstResponse =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt. Sed sed dictum orci, in pretium erat. Proin ut mi a arcu mollis hendrerit. Ut id est finibus, egestas tellus ac, pharetra ante.';

  secondResponse =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor. Aenean dui magna, vehicula in lacinia non, euismod sed odio. Aliquam erat volutpat. Integer iaculis eu tellus vel tincidunt. Sed sed dictum orci, in pretium erat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus et varius tortor.';
}
