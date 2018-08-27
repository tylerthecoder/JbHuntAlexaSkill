import  urllib.request
from bs4 import BeautifulSoup
quote_page = 'http://www.arkansasgasprices.com/index.aspx?'
page = urllib.request.urlopen(quote_page)
soup = BeautifulSoup(page, 'html.parser')
name_box = soup.find("table", attrs={'class': p_v2})
print(name_box)
