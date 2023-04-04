 document.getElementById('info.txt')
            .addEventListener('change', function() {
              
            var fr=new FileReader();
            fr.onload=function(){
                document.getElementById('output')
                        .textContent=fr.result;
            }
              
            fr.readAsText(this.files[0]);
        })
